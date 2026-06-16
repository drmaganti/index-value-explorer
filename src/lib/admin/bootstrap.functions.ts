import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import {
  FinnhubIndexProvider,
  FinnhubFundamentalsProvider,
  YahooFundamentalsProvider,
  type YahooSupplementalMetrics,
} from "@/services";
import type { StockMetrics } from "@/services/types";
import { normalizeTickerForProvider } from "@/services/symbolNormalization";
import { getLatestCompletedTradingDay } from "@/lib/marketCalendar";
import { supportedIndexes, SUPPORTED_INDEX_SYMBOLS } from "@/lib/supportedIndexes";

const MAX_TICKERS_PER_INDEX = 60;

const TRACKED_FIELDS: Array<keyof StockMetrics> = [
  "currentPrice",
  "high52Week",
  "low52Week",
  "marketCapB",
  "forwardPE",
  "trailingPE",
  "evToEbitda",
  "priceToBook",
  "revenueGrowthPct",
  "earningsGrowthPct",
  "operatingMarginPct",
  "grossMarginPct",
  "returnOnEquityPct",
  "freeCashFlowB",
  "debtToEquity",
  "beta",
];

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

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
    try {
      const live = await provider.getConstituents(symbol);
      const providerName =
        symbol === "SPY" || symbol === "QQQ" || symbol === "DIA" ? "wikipedia" : "finnhub";

      const sorted = [...live].sort(
        (a, b) => (b.weight ?? 0) - (a.weight ?? 0),
      );
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
      perIndex[symbol] = { count: rows.length, provider: providerName };
    } catch (err) {
      failed += 1;
      perIndex[symbol] = {
        count: 0,
        provider: "n/a",
        error: err instanceof Error ? err.message : String(err),
      };
      console.error(`bootstrap: constituents failed for ${symbol}:`, err);
    }
  }

  return { perIndex, processed, failed };
}

async function refreshSnapshotsInternal(): Promise<{
  processed: number;
  failed: number;
  failedTickers: string[];
  tradeDate: string;
  tickerCount: number;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const apiKey = process.env.FINNHUB_API_KEY ?? "";
  const tradeDate = getLatestCompletedTradingDay();

  const { data: rows, error: cErr } = await supabaseAdmin
    .from("index_constituents")
    .select("ticker, company_name, sector, index_symbol")
    .eq("is_active", true);
  if (cErr) throw new Error(`Failed to read constituents: ${cErr.message}`);

  const tickerMap = new Map<string, { name?: string; sector?: string }>();
  for (const r of rows ?? []) {
    const t = normalizeTickerForProvider(r.ticker);
    if (!tickerMap.has(t)) {
      tickerMap.set(t, {
        name: r.company_name ?? undefined,
        sector: r.sector ?? undefined,
      });
    }
  }
  const tickers = [...tickerMap.keys()];
  if (tickers.length === 0) {
    return { processed: 0, failed: 0, failedTickers: [], tradeDate, tickerCount: 0 };
  }

  const fundamentals = new FinnhubFundamentalsProvider(apiKey);
  const yahoo = new YahooFundamentalsProvider();
  const [fhRes, yhRes] = await Promise.allSettled([
    fundamentals.getMetrics(tickers),
    yahoo.getSupplementalMetrics(tickers),
  ]);
  const fh = fhRes.status === "fulfilled" ? fhRes.value : [];
  const yh = yhRes.status === "fulfilled" ? yhRes.value : [];
  const fhByTicker = new Map<string, StockMetrics>(
    fh.map((m) => [normalizeTickerForProvider(m.ticker), m]),
  );
  const yhByTicker = new Map<string, YahooSupplementalMetrics>(
    yh.map((m) => [normalizeTickerForProvider(m.ticker), m]),
  );

  let processed = 0;
  let failed = 0;
  const failedTickers: string[] = [];
  type SnapshotRow = {
    ticker: string;
    trade_date: string;
    close_price: number | null;
    previous_close: number | null;
    fifty_two_week_high: number | null;
    fifty_two_week_low: number | null;
    two_hundred_day_moving_average: number | null;
    market_cap_b: number | null;
    forward_pe: number | null;
    trailing_pe: number | null;
    ev_to_ebitda: number | null;
    price_to_book: number | null;
    revenue_growth: number | null;
    earnings_growth: number | null;
    operating_margin: number | null;
    gross_margin: number | null;
    return_on_equity: number | null;
    free_cash_flow_b: number | null;
    debt_to_equity: number | null;
    beta: number | null;
    sector: string | null;
    industry: string | null;
    provider_primary: string;
    provider_secondary: string;
    data_completeness_pct: number;
    missing_data_count: number;
  };
  const snapshotRows: SnapshotRow[] = [];

  for (const ticker of tickers) {
    try {
      const fhRow = fhByTicker.get(ticker);
      const yhRow = yhByTicker.get(ticker);
      if (!fhRow && !yhRow) {
        failed += 1;
        failedTickers.push(ticker);
        continue;
      }
      const merged: Record<string, unknown> = { ticker };
      for (const f of TRACKED_FIELDS) {
        const key = f as string;
        const fv = (fhRow as unknown as Record<string, unknown> | undefined)?.[key];
        const yv = (yhRow as unknown as Record<string, unknown> | undefined)?.[key];
        merged[key] = fv ?? yv;
      }
      const m = merged as Record<string, number | undefined>;
      const present = TRACKED_FIELDS.filter((f) => merged[f as string] != null).length;
      const missing = TRACKED_FIELDS.length - present;
      const completeness = Math.round((present / TRACKED_FIELDS.length) * 100);

      const meta = tickerMap.get(ticker);
      snapshotRows.push({
        ticker,
        trade_date: tradeDate,
        close_price: num(m.currentPrice),
        previous_close: null,
        fifty_two_week_high: num(m.high52Week),
        fifty_two_week_low: num(m.low52Week),
        two_hundred_day_moving_average: null,
        market_cap_b: num(m.marketCapB),
        forward_pe: num(m.forwardPE),
        trailing_pe: num(m.trailingPE),
        ev_to_ebitda: num(m.evToEbitda),
        price_to_book: num(m.priceToBook),
        revenue_growth: num(m.revenueGrowthPct),
        earnings_growth: num(m.earningsGrowthPct),
        operating_margin: num(m.operatingMarginPct),
        gross_margin: num(m.grossMarginPct),
        return_on_equity: num(m.returnOnEquityPct),
        free_cash_flow_b: num(m.freeCashFlowB),
        debt_to_equity: num(m.debtToEquity),
        beta: num(m.beta),
        sector: meta?.sector ?? null,
        industry: null,
        provider_primary: fhRow ? "finnhub" : "yahoo",
        provider_secondary: fhRow && yhRow ? "yahoo" : "",
        data_completeness_pct: completeness,
        missing_data_count: missing,
      });
      processed += 1;
    } catch (err) {
      failed += 1;
      failedTickers.push(ticker);
      console.error(`bootstrap: snapshot build failed for ${ticker}:`, err);
    }
  }

  const CHUNK = 100;
  for (let i = 0; i < snapshotRows.length; i += CHUNK) {
    const chunk = snapshotRows.slice(i, i + CHUNK);
    const { error } = await supabaseAdmin
      .from("stock_daily_snapshots")
      .upsert(chunk, { onConflict: "ticker,trade_date" });
    if (error) {
      console.error("bootstrap: snapshot upsert failed:", error);
      failed += chunk.length;
      processed -= chunk.length;
    }
  }

  return { processed, failed, failedTickers, tradeDate, tickerCount: tickers.length };
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
    let snapshotResult: Awaited<ReturnType<typeof refreshSnapshotsInternal>> | null = null;
    let errorMessage: string | undefined;

    try {
      constituentResult = await refreshConstituentsInternal();
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    try {
      snapshotResult = await refreshSnapshotsInternal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errorMessage = errorMessage ? `${errorMessage}; ${msg}` : msg;
    }

    const cProcessed = constituentResult?.processed ?? 0;
    const cFailed = constituentResult?.failed ?? 0;
    const sProcessed = snapshotResult?.processed ?? 0;
    const sFailed = snapshotResult?.failed ?? 0;

    const status =
      cProcessed > 0 && sProcessed > 0 && cFailed === 0 && sFailed === 0
        ? "success"
        : cProcessed > 0 || sProcessed > 0
          ? "partial_success"
          : "failed";

    await supabaseAdmin.from("refresh_job_logs").insert({
      job_name: "bootstrapInitialMarketData",
      status,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      records_processed: cProcessed + sProcessed,
      records_failed: cFailed + sFailed,
      error_message: errorMessage,
      metadata_json: {
        constituents: constituentResult?.perIndex ?? {},
        snapshots: snapshotResult
          ? {
              tradeDate: snapshotResult.tradeDate,
              tickerCount: snapshotResult.tickerCount,
              failedTickers: snapshotResult.failedTickers,
            }
          : {},
      },
    });

    return {
      status,
      constituents: constituentResult,
      snapshots: snapshotResult,
      errorMessage,
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

export const triggerRefreshSnapshots = createServerFn({ method: "POST" })
  .inputValidator(adminInput)
  .handler(async ({ data }) => {
    checkAdmin(data.adminSecret);
    if (!process.env.FINNHUB_API_KEY) {
      throw new Error("FINNHUB_API_KEY is required.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const startedAt = new Date().toISOString();
    const result = await refreshSnapshotsInternal();
    const status =
      result.failed === 0 && result.processed > 0
        ? "success"
        : result.processed > 0
          ? "partial"
          : "error";
    await supabaseAdmin.from("refresh_job_logs").insert({
      job_name: "refreshDailyStockSnapshots",
      status,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      records_processed: result.processed,
      records_failed: result.failed,
      metadata_json: {
        tradeDate: result.tradeDate,
        tickerCount: result.tickerCount,
        failedTickers: result.failedTickers,
      },
    });
    return { status, ...result };
  });

export const getBootstrapStatus = createServerFn({ method: "POST" })
  .inputValidator(adminInput)
  .handler(async ({ data }) => {
    checkAdmin(data.adminSecret);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ count: activeConstituents }, { data: distinctTickers }, { data: latestSnap }, { data: lastBootstrap }, { data: perIndexRows }] =
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
          .select("status, completed_at, records_processed, records_failed, error_message, metadata_json")
          .eq("job_name", "bootstrapInitialMarketData")
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from("index_constituents")
          .select("index_symbol")
          .eq("is_active", true),
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
    };
  });