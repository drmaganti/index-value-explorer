import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { FinnhubIndexProvider } from "@/services";
import { normalizeTickerForProvider } from "@/services/symbolNormalization";
import { getLatestCompletedTradingDay } from "@/lib/marketCalendar";
import { supportedIndexes, SUPPORTED_INDEX_SYMBOLS } from "@/lib/supportedIndexes";
import { serializeError } from "@/lib/admin/serializeError";
import { SPY_SEED_LIST } from "@/lib/admin/spySeed";
import { fetchDailyCandleSnapshot } from "@/services/yahooChart";
import { fetchFundamentalsRow } from "@/services/finnhubCandles";

const MAX_TICKERS_PER_INDEX = 60;
const QUEUE_BATCH_SIZE = 5;
const STALE_IN_PROGRESS_MS = 5 * 60 * 1000;

const SNAPSHOT_TRACKED_FIELDS = [
  "close_price",
  "fifty_two_week_high",
  "fifty_two_week_low",
  "two_hundred_day_moving_average",
  "market_cap_b",
  "forward_pe",
  "trailing_pe",
  "ev_to_ebitda",
  "price_to_book",
  "revenue_growth",
  "earnings_growth",
  "operating_margin",
  "gross_margin",
  "return_on_equity",
  "free_cash_flow_b",
  "debt_to_equity",
  "beta",
] as const;

function checkAdmin(secret?: string): void {
  const required = process.env.ADMIN_BOOTSTRAP_SECRET ?? "";
  // In dev (no secret configured) the admin endpoints are unlocked. In any
  // env where the secret is configured, callers must present it.
  if (!required) return;
  if (secret !== required) {
    throw new Error("Unauthorized: admin secret missing or invalid.");
  }
}

const adminInput = z.object({ adminSecret: z.string().optional() });

// ---------------------------------------------------------------------------
// Constituents refresh (Wikipedia → Finnhub ETF → seed list for SPY only)
// ---------------------------------------------------------------------------

async function refreshConstituentsInternal(): Promise<{
  perIndex: Record<string, { count: number; provider: string; error?: string }>;
  processed: number;
  failed: number;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const provider = new FinnhubIndexProvider(process.env.FINNHUB_API_KEY ?? "");
  const todayISO = new Date().toISOString().slice(0, 10);
  const perIndex: Record<string, { count: number; provider: string; error?: string }> = {};
  let processed = 0;
  let failed = 0;

  for (const symbol of SUPPORTED_INDEX_SYMBOLS) {
    let providerName = "wikipedia";
    let live: Array<{ ticker: string; name?: string; sector?: string; weight?: number }> = [];
    let lastError: string | undefined;

    try {
      live = await provider.getConstituents(symbol);
    } catch (err) {
      lastError = serializeError(err);
      console.error(`bootstrap: primary constituent fetch failed for ${symbol}: ${lastError}`);
    }

    // Seed-list fallback: SPY only, used when Wikipedia parsing changes and
    // Finnhub ETF holdings is also unavailable on the free tier.
    if (live.length === 0 && symbol === "SPY") {
      providerName = "seed_list";
      live = SPY_SEED_LIST.map((s, i) => ({
        ticker: s.ticker,
        name: s.name,
        sector: s.sector,
        // Synthetic weight just to preserve the existing top-N ordering.
        weight: (SPY_SEED_LIST.length - i) / SPY_SEED_LIST.length,
      }));
      console.warn(
        `bootstrap: SPY using static seed list of ${live.length} names (live providers unavailable). lastError=${lastError ?? "n/a"}`,
      );
    }

    if (live.length === 0) {
      failed += 1;
      perIndex[symbol] = { count: 0, provider: "n/a", error: lastError ?? "No data returned" };
      continue;
    }

    try {
      const sorted = [...live].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
      const capped = sorted.slice(0, MAX_TICKERS_PER_INDEX);

      await supabaseAdmin
        .from("index_constituents")
        .update({ is_active: false })
        .eq("index_symbol", symbol)
        .eq("is_active", true);

      const rows = capped
        .filter((c) => c.ticker && c.ticker.length > 0)
        .map((c) => ({
          index_symbol: symbol,
          ticker: normalizeTickerForProvider(c.ticker),
          company_name: c.name ?? null,
          sector: c.sector ?? null,
          weight: c.weight ?? null,
          provider: providerName,
          as_of_date: todayISO,
          is_active: true,
        }));

      if (rows.length > 0) {
        const { error } = await supabaseAdmin
          .from("index_constituents")
          .upsert(rows, { onConflict: "index_symbol,ticker,as_of_date" });
        if (error) throw error;
      }

      processed += rows.length;
      perIndex[symbol] = {
        count: rows.length,
        provider: providerName,
        error: lastError && providerName === "seed_list" ? lastError : undefined,
      };
    } catch (err) {
      failed += 1;
      perIndex[symbol] = { count: 0, provider: "n/a", error: serializeError(err) };
      console.error(`bootstrap: persist constituents failed for ${symbol}: ${serializeError(err)}`);
    }
  }

  return { perIndex, processed, failed };
}

// ---------------------------------------------------------------------------
// Queue creation — dedupe tickers across active constituents
// ---------------------------------------------------------------------------

async function createBootstrapQueueInternal(): Promise<{
  inserted: number;
  totalUnique: number;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows, error } = await supabaseAdmin
    .from("index_constituents")
    .select("ticker, index_symbol")
    .eq("is_active", true);
  if (error) throw new Error(`Failed to read constituents: ${error.message}`);

  const byTicker = new Map<string, Set<string>>();
  for (const r of rows ?? []) {
    const t = normalizeTickerForProvider(r.ticker);
    if (!t) continue;
    if (!byTicker.has(t)) byTicker.set(t, new Set());
    byTicker.get(t)!.add(r.index_symbol);
  }

  const queueRows = [...byTicker.entries()].map(([ticker, symbols]) => ({
    ticker,
    index_symbols: [...symbols],
    status: "pending" as const,
    attempts: 0,
    last_error: null,
    next_retry_at: null,
  }));

  if (queueRows.length === 0) return { inserted: 0, totalUnique: 0 };

  // Upsert: existing failed/completed rows get their status reset to pending
  // ONLY when admin explicitly wants a fresh queue — we just refresh
  // index_symbols here. Status is left alone for already-completed tickers.
  const { error: upErr } = await supabaseAdmin
    .from("bootstrap_ticker_queue")
    .upsert(
      queueRows.map((r) => ({ ticker: r.ticker, index_symbols: r.index_symbols })),
      { onConflict: "ticker", ignoreDuplicates: false },
    );
  if (upErr) throw new Error(`Failed to upsert queue: ${upErr.message}`);

  return { inserted: queueRows.length, totalUnique: queueRows.length };
}

// ---------------------------------------------------------------------------
// Queue processing — chunked, low concurrency, free-tier safe
// ---------------------------------------------------------------------------

async function processQueueOnce(): Promise<{
  processed: number;
  failed: number;
  picked: number;
  details: Array<{ ticker: string; status: "completed" | "failed"; error?: string }>;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const apiKey = process.env.FINNHUB_API_KEY ?? "";
  if (!apiKey) throw new Error("FINNHUB_API_KEY is required (used for fundamentals).");

  const nowISO = new Date().toISOString();
  const tradeDate = getLatestCompletedTradingDay();

  // Re-queue any rows stuck in_progress for more than 5 minutes (worker crash,
  // timeout, etc.). Keeps the pipeline self-healing.
  const staleCutoff = new Date(Date.now() - STALE_IN_PROGRESS_MS).toISOString();
  await supabaseAdmin
    .from("bootstrap_ticker_queue")
    .update({ status: "pending", next_retry_at: null })
    .eq("status", "in_progress")
    .lt("updated_at", staleCutoff);

  const { data: pending, error: pErr } = await supabaseAdmin
    .from("bootstrap_ticker_queue")
    .select("id, ticker, attempts")
    .eq("status", "pending")
    .or(`next_retry_at.is.null,next_retry_at.lte.${nowISO}`)
    .order("attempts", { ascending: true })
    .limit(QUEUE_BATCH_SIZE);
  if (pErr) throw new Error(`Failed to read queue: ${pErr.message}`);

  const batch = pending ?? [];
  if (batch.length === 0) {
    return { processed: 0, failed: 0, picked: 0, details: [] };
  }

  // Lock the batch.
  const ids = batch.map((b) => b.id);
  await supabaseAdmin
    .from("bootstrap_ticker_queue")
    .update({ status: "in_progress" })
    .in("id", ids);

  let processed = 0;
  let failed = 0;
  const details: Array<{ ticker: string; status: "completed" | "failed"; error?: string }> = [];

  // Serial processing — the rate limiter caps concurrency anyway; serial
  // makes logs deterministic and keeps the per-invocation runtime bounded.
  for (const row of batch) {
    const ticker = row.ticker;
    const attempts = (row.attempts ?? 0) + 1;
    try {
      const [candle, fundamentals] = await Promise.all([
        fetchDailyCandleSnapshot(ticker, apiKey),
        fetchFundamentalsRow(ticker, apiKey),
      ]);

      // Need at least a close price to call it a usable snapshot.
      if (candle.closePrice == null) {
        throw new Error("No candle data returned (delisted or unsupported symbol).");
      }

      const snapshot = {
        ticker,
        trade_date: candle.tradeDateISO ?? tradeDate,
        close_price: candle.closePrice,
        previous_close: candle.previousClose,
        fifty_two_week_high: candle.fiftyTwoWeekHigh,
        fifty_two_week_low: candle.fiftyTwoWeekLow,
        two_hundred_day_moving_average: candle.twoHundredDayMovingAverage,
        market_cap_b: fundamentals.marketCapB,
        forward_pe: fundamentals.forwardPE,
        trailing_pe: fundamentals.trailingPE,
        ev_to_ebitda: fundamentals.evToEbitda,
        price_to_book: fundamentals.priceToBook,
        revenue_growth: fundamentals.revenueGrowthPct,
        earnings_growth: fundamentals.earningsGrowthPct,
        operating_margin: fundamentals.operatingMarginPct,
        gross_margin: fundamentals.grossMarginPct,
        return_on_equity: fundamentals.returnOnEquityPct,
        free_cash_flow_b: fundamentals.freeCashFlowB,
        debt_to_equity: fundamentals.debtToEquity,
        beta: fundamentals.beta,
        sector: null,
        industry: null,
        provider_primary: "finnhub",
        provider_secondary: "",
        data_completeness_pct: computeCompleteness({
          close_price: candle.closePrice,
          fifty_two_week_high: candle.fiftyTwoWeekHigh,
          fifty_two_week_low: candle.fiftyTwoWeekLow,
          two_hundred_day_moving_average: candle.twoHundredDayMovingAverage,
          ...fundamentals,
        }),
        missing_data_count: 0,
      };
      snapshot.missing_data_count = SNAPSHOT_TRACKED_FIELDS.length -
        Math.round((snapshot.data_completeness_pct / 100) * SNAPSHOT_TRACKED_FIELDS.length);

      const { error: upErr } = await supabaseAdmin
        .from("stock_daily_snapshots")
        .upsert(snapshot, { onConflict: "ticker,trade_date" });
      if (upErr) throw upErr;

      await supabaseAdmin
        .from("bootstrap_ticker_queue")
        .update({
          status: "completed",
          attempts,
          last_error: null,
          next_retry_at: null,
          trade_date: snapshot.trade_date,
        })
        .eq("id", row.id);

      processed += 1;
      details.push({ ticker, status: "completed" });
    } catch (err) {
      const msg = serializeError(err);
      const isRateLimit = /429|rate/i.test(msg);
      const retryAt = isRateLimit
        ? new Date(Date.now() + 60_000).toISOString()
        : new Date(Date.now() + 10 * 60_000).toISOString();
      // 3 strikes → failed; otherwise back to pending with retry timer.
      const nextStatus = attempts >= 3 ? "failed" : "pending";
      await supabaseAdmin
        .from("bootstrap_ticker_queue")
        .update({
          status: nextStatus,
          attempts,
          last_error: msg.slice(0, 2000),
          next_retry_at: nextStatus === "pending" ? retryAt : null,
        })
        .eq("id", row.id);
      failed += 1;
      details.push({ ticker, status: "failed", error: msg.slice(0, 240) });
      console.error(`queue: ${ticker} attempt ${attempts} failed: ${msg}`);
    }
  }

  return { processed, failed, picked: batch.length, details };
}

function computeCompleteness(snapshot: Record<string, number | null>): number {
  const present = SNAPSHOT_TRACKED_FIELDS.filter((f) => {
    const v = snapshot[f];
    return typeof v === "number" && Number.isFinite(v);
  }).length;
  return Math.round((present / SNAPSHOT_TRACKED_FIELDS.length) * 100);
}

// ---------------------------------------------------------------------------
// Daily price-only refresh (no fundamentals)
// ---------------------------------------------------------------------------

async function refreshDailyPricesInternal(limit = 20): Promise<{
  processed: number;
  failed: number;
  failedTickers: string[];
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const apiKey = process.env.FINNHUB_API_KEY ?? "";
  if (!apiKey) throw new Error("FINNHUB_API_KEY is required.");

  // Only refresh tickers that have already completed bootstrap.
  const { data: rows, error } = await supabaseAdmin
    .from("bootstrap_ticker_queue")
    .select("ticker")
    .eq("status", "completed")
    .order("trade_date", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw new Error(`Failed to read queue: ${error.message}`);

  let processed = 0;
  let failed = 0;
  const failedTickers: string[] = [];

  for (const r of rows ?? []) {
    try {
      const candle = await fetchDailyCandleSnapshot(r.ticker, apiKey);
      if (candle.closePrice == null) continue;
      const tradeDate = candle.tradeDateISO ?? getLatestCompletedTradingDay();
      const { error: upErr } = await supabaseAdmin
        .from("stock_daily_snapshots")
        .upsert(
          {
            ticker: r.ticker,
            trade_date: tradeDate,
            close_price: candle.closePrice,
            previous_close: candle.previousClose,
            fifty_two_week_high: candle.fiftyTwoWeekHigh,
            fifty_two_week_low: candle.fiftyTwoWeekLow,
            two_hundred_day_moving_average: candle.twoHundredDayMovingAverage,
            provider_primary: "finnhub",
          },
          { onConflict: "ticker,trade_date" },
        );
      if (upErr) throw upErr;
      await supabaseAdmin
        .from("bootstrap_ticker_queue")
        .update({ trade_date: tradeDate })
        .eq("ticker", r.ticker);
      processed += 1;
    } catch (err) {
      failed += 1;
      failedTickers.push(r.ticker);
      console.error(`daily-prices: ${r.ticker} failed: ${serializeError(err)}`);
    }
  }

  return { processed, failed, failedTickers };
}

export const bootstrapInitialMarketData = createServerFn({ method: "POST" })
  .inputValidator(adminInput)
  .handler(async ({ data }) => {
    checkAdmin(data.adminSecret);
    if (!process.env.FINNHUB_API_KEY) {
      throw new Error(
        "FINNHUB_API_KEY is required before initial data bootstrap can run.",
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const startedAt = new Date().toISOString();
    let constituentResult: Awaited<ReturnType<typeof refreshConstituentsInternal>> | null = null;
    let queueResult: Awaited<ReturnType<typeof createBootstrapQueueInternal>> | null = null;
    let errorMessage: string | undefined;

    try {
      constituentResult = await refreshConstituentsInternal();
    } catch (err) {
      errorMessage = serializeError(err);
    }

    try {
      queueResult = await createBootstrapQueueInternal();
    } catch (err) {
      const msg = serializeError(err);
      errorMessage = errorMessage ? `${errorMessage}; ${msg}` : msg;
    }

    const cProcessed = constituentResult?.processed ?? 0;
    const cFailed = constituentResult?.failed ?? 0;
    const queued = queueResult?.inserted ?? 0;

    const status =
      cProcessed > 0 && cFailed === 0 && queued > 0
        ? "success"
        : cProcessed > 0 || queued > 0
          ? "partial_success"
          : "failed";

    await supabaseAdmin.from("refresh_job_logs").insert({
      job_name: "bootstrapInitialMarketData",
      status,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      records_processed: cProcessed + queued,
      records_failed: cFailed,
      error_message: errorMessage,
      metadata_json: {
        constituents: constituentResult?.perIndex ?? {},
        queue: queueResult ?? {},
        note: "Snapshots are populated separately by processing the bootstrap queue in chunks.",
      },
    });

    return {
      status,
      constituents: constituentResult,
      queue: queueResult,
      errorMessage,
      nextStep:
        "Click 'Process next 10 tickers' repeatedly until the pending count reaches zero.",
    };
  });

export const triggerRefreshConstituents = createServerFn({ method: "POST" })
  .inputValidator(adminInput)
  .handler(async ({ data }) => {
    checkAdmin(data.adminSecret);
    if (!process.env.FINNHUB_API_KEY) {
      throw new Error("FINNHUB_API_KEY is required.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const startedAt = new Date().toISOString();
    const result = await refreshConstituentsInternal();
    const status = result.failed === 0 ? "success" : result.processed > 0 ? "partial" : "error";
    await supabaseAdmin.from("refresh_job_logs").insert({
      job_name: "refreshIndexConstituents",
      status,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      records_processed: result.processed,
      records_failed: result.failed,
      metadata_json: result.perIndex,
    });
    return { status, ...result };
  });

export const triggerCreateBootstrapQueue = createServerFn({ method: "POST" })
  .inputValidator(adminInput)
  .handler(async ({ data }) => {
    checkAdmin(data.adminSecret);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const startedAt = new Date().toISOString();
    const result = await createBootstrapQueueInternal();
    await supabaseAdmin.from("refresh_job_logs").insert({
      job_name: "createBootstrapQueue",
      status: "success",
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      records_processed: result.inserted,
      records_failed: 0,
      metadata_json: result,
    });
    return { status: "success", ...result };
  });

export const processBootstrapTickerQueue = createServerFn({ method: "POST" })
  .inputValidator(adminInput)
  .handler(async ({ data }) => {
    checkAdmin(data.adminSecret);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const startedAt = new Date().toISOString();
    const result = await processQueueOnce();
    const status =
      result.picked === 0
        ? "success"
        : result.failed === 0
          ? "success"
          : result.processed > 0
            ? "partial"
            : "error";
    await supabaseAdmin.from("refresh_job_logs").insert({
      job_name: "processBootstrapTickerQueue",
      status,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      records_processed: result.processed,
      records_failed: result.failed,
      metadata_json: { picked: result.picked, details: result.details },
    });
    return { status, ...result };
  });

export const retryFailedTickers = createServerFn({ method: "POST" })
  .inputValidator(adminInput)
  .handler(async ({ data }) => {
    checkAdmin(data.adminSecret);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin
      .from("bootstrap_ticker_queue")
      .update({
        status: "pending",
        attempts: 0,
        last_error: null,
        next_retry_at: null,
      })
      .eq("status", "failed")
      .select("ticker");
    if (error) throw new Error(serializeError(error));
    return { status: "success", reset: updated?.length ?? 0 };
  });

export const refreshDailyPrices = createServerFn({ method: "POST" })
  .inputValidator(adminInput)
  .handler(async ({ data }) => {
    checkAdmin(data.adminSecret);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const startedAt = new Date().toISOString();
    const result = await refreshDailyPricesInternal(30);
    await supabaseAdmin.from("refresh_job_logs").insert({
      job_name: "refreshDailyPrices",
      status: result.failed === 0 ? "success" : result.processed > 0 ? "partial" : "error",
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      records_processed: result.processed,
      records_failed: result.failed,
      metadata_json: { failedTickers: result.failedTickers },
    });
    return { status: "success", ...result };
  });

// Legacy snapshot path — kept exported for any existing cron/wiring, but it
// now delegates to the queue path so we never bulk-fetch all tickers in one
// run again.
export const triggerRefreshSnapshots = createServerFn({ method: "POST" })
  .inputValidator(adminInput)
  .handler(async ({ data }) => {
    checkAdmin(data.adminSecret);
    await createBootstrapQueueInternal();
    const result = await processQueueOnce();
    return { status: "success", ...result, note: "Processed one chunk via queue." };
  });

export const getBootstrapStatus = createServerFn({ method: "POST" })
  .inputValidator(adminInput)
  .handler(async ({ data }) => {
    checkAdmin(data.adminSecret);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [
      { count: activeConstituents },
      { data: distinctTickers },
      { data: latestSnap },
      { data: lastBootstrap },
      { data: perIndexRows },
      { count: queuePending },
      { count: queueInProgress },
      { count: queueCompleted },
      { count: queueFailed },
      { data: lastFailed },
    ] =
      await Promise.all([
        supabaseAdmin
          .from("index_constituents")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
        supabaseAdmin
          .from("index_constituents")
          .select("ticker")
          .eq("is_active", true),
        supabaseAdmin
          .from("stock_daily_snapshots")
          .select("trade_date, data_completeness_pct")
          .order("trade_date", { ascending: false })
          .limit(500),
        supabaseAdmin
          .from("refresh_job_logs")
          .select("job_name, status, completed_at, records_processed, records_failed, error_message, metadata_json")
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from("index_constituents")
          .select("index_symbol")
          .eq("is_active", true),
        supabaseAdmin
          .from("bootstrap_ticker_queue")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabaseAdmin
          .from("bootstrap_ticker_queue")
          .select("*", { count: "exact", head: true })
          .eq("status", "in_progress"),
        supabaseAdmin
          .from("bootstrap_ticker_queue")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed"),
        supabaseAdmin
          .from("bootstrap_ticker_queue")
          .select("*", { count: "exact", head: true })
          .eq("status", "failed"),
        supabaseAdmin
          .from("bootstrap_ticker_queue")
          .select("ticker, last_error, attempts, next_retry_at")
          .eq("status", "failed")
          .order("updated_at", { ascending: false })
          .limit(10),
      ]);

    const uniqueTickers = new Set((distinctTickers ?? []).map((r) => r.ticker)).size;

    let latestTradeDate: string | null = null;
    let avgCompleteness: number | null = null;
    if (latestSnap && latestSnap.length > 0) {
      latestTradeDate = latestSnap[0].trade_date;
      const sameDay = latestSnap.filter((r) => r.trade_date === latestTradeDate);
      const vals = sameDay.map((r) => r.data_completeness_pct ?? 0);
      if (vals.length > 0) {
        avgCompleteness = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      }
    }

    const indexCounts: Record<string, number> = {};
    for (const r of perIndexRows ?? []) {
      indexCounts[r.index_symbol] = (indexCounts[r.index_symbol] ?? 0) + 1;
    }

    return {
      supportedIndexes,
      indexCounts,
      activeConstituents: activeConstituents ?? 0,
      uniqueTickers,
      latestTradeDate,
      avgCompletenessPct: avgCompleteness,
      lastBootstrap: lastBootstrap ?? null,
      queue: {
        pending: queuePending ?? 0,
        inProgress: queueInProgress ?? 0,
        completed: queueCompleted ?? 0,
        failed: queueFailed ?? 0,
      },
      recentFailures: lastFailed ?? [],
    };
  });