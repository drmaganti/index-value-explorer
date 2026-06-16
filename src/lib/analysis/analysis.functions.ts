import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import type { AnalysisRequest } from "./types";
import type { StockMetrics, IndexConstituent } from "@/services";
import {
  buildReportFromEngine,
  runScoringEngine,
  type FilterConfig,
  type ScoringConfig,
  DEFAULT_SCORING_WEIGHTS,
} from "@/services";
import { normalizeTickerForProvider } from "@/services/symbolNormalization";
import { getLatestCompletedTradingDay, classifyFreshness } from "@/lib/marketCalendar";
import { FinnhubIndexProvider } from "@/services";

const analysisModeSchema = z.enum(["conservative", "balanced", "opportunistic"]);

const analysisRequestSchema = z.object({
  symbol: z.string().trim().min(1).max(8),
  settings: z.object({
    minMarketCapB: z.number().min(0).max(10000),
    minPullbackPct: z.number().min(0).max(100),
    maxPullbackPct: z.number().min(0).max(100),
    minOperatingMarginPct: z.number().min(-100).max(100),
    allowNegativeFcf: z.boolean(),
    requireAbove200dma: z.boolean(),
    topN: z.number().int().min(1).max(100),
    mode: analysisModeSchema,
  }),
});

export const runAnalysis = createServerFn({ method: "POST" })
  .inputValidator(analysisRequestSchema)
  .handler(async ({ data }) => {
    const request: AnalysisRequest = {
      symbol: data.symbol.trim().toUpperCase(),
      settings: data.settings,
    };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Load latest active constituents for the selected index.
    let { data: constituentRows, error: cErr } = await supabaseAdmin
      .from("index_constituents")
      .select("ticker, company_name, sector, weight, as_of_date")
      .eq("index_symbol", request.symbol)
      .eq("is_active", true)
      .order("weight", { ascending: false });

    if (cErr) throw new Error(`Failed to load constituents: ${cErr.message}`);

    // On-demand bootstrap: if the scheduled refresh hasn't populated this
    // index yet, fetch live constituents now and persist them so subsequent
    // runs hit the cache.
    if (!constituentRows || constituentRows.length === 0) {
      try {
        const provider = new FinnhubIndexProvider(process.env.FINNHUB_API_KEY ?? "");
        const live = await provider.getConstituents(request.symbol);
        const todayISO = new Date().toISOString().slice(0, 10);
        const providerName =
          request.symbol === "SPY" || request.symbol === "QQQ" || request.symbol === "DIA"
            ? "wikipedia"
            : "finnhub";
        const rows = live
          .filter((c) => c.ticker && c.ticker.length > 0)
          .map((c) => ({
            index_symbol: request.symbol,
            ticker: normalizeTickerForProvider(c.ticker),
            company_name: c.name ?? null,
            sector: c.sector ?? null,
            weight: c.weight ?? null,
            provider: providerName,
            as_of_date: todayISO,
            is_active: true,
          }));
        if (rows.length > 0) {
          await supabaseAdmin
            .from("index_constituents")
            .upsert(rows, { onConflict: "index_symbol,ticker,as_of_date" });
        }
        constituentRows = rows.map((r) => ({
          ticker: r.ticker,
          company_name: r.company_name,
          sector: r.sector,
          weight: r.weight,
          as_of_date: r.as_of_date,
        }));
      } catch (err) {
        throw new Error(
          `Constituent cache for ${request.symbol} is empty and live bootstrap failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    if (!constituentRows || constituentRows.length === 0) {
      throw new Error(`No constituents available for ${request.symbol}.`);
    }

    const constituentsAsOf = constituentRows[0]?.as_of_date ?? null;
    const constituents: IndexConstituent[] = constituentRows.map((r) => ({
      ticker: normalizeTickerForProvider(r.ticker),
      name: r.company_name ?? r.ticker,
      sector: r.sector ?? "Unknown",
      weight: typeof r.weight === "number" ? r.weight : undefined,
    }));

    // Cap to top-weighted 60 to match prior behavior.
    const MAX_TICKERS_PER_RUN = 60;
    const trimmedConstituents = constituents.slice(0, MAX_TICKERS_PER_RUN);
    const tickers = trimmedConstituents.map((c) => c.ticker);

    // 2) Load the latest stock snapshot per ticker. We pick the most
    // recent trade_date that has any data for the requested tickers, then
    // load only that day's rows so the report is point-in-time consistent.
    const { data: latestDateRow } = await supabaseAdmin
      .from("stock_daily_snapshots")
      .select("trade_date")
      .in("ticker", tickers)
      .order("trade_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const marketDataAsOf = latestDateRow?.trade_date ?? null;

    let snapshotRows: Array<Record<string, unknown>> = [];
    if (marketDataAsOf) {
      const { data: rows, error: sErr } = await supabaseAdmin
        .from("stock_daily_snapshots")
        .select("*")
        .eq("trade_date", marketDataAsOf)
        .in("ticker", tickers);
      if (sErr) throw new Error(`Failed to load snapshots: ${sErr.message}`);
      snapshotRows = (rows ?? []) as Array<Record<string, unknown>>;
    }

    const metrics: StockMetrics[] = snapshotRows.map(snapshotRowToStockMetrics);

    // 3) Apply existing scoring engine — source of truth, untouched.
    const engineResult = runScoringEngine({
      constituents: trimmedConstituents,
      metrics,
      filters: toFilterConfig(request),
      scoring: toScoringConfig(request),
    });

    const report = buildReportFromEngine(request, engineResult);

    // 4) Annotate freshness + as-of dates.
    const freshness = classifyFreshness(marketDataAsOf);
    const latest = getLatestCompletedTradingDay();
    const freshnessNote =
      freshness === "missing"
        ? marketDataAsOf
          ? `Cached snapshot is from ${marketDataAsOf}; latest completed market close was ${latest}.`
          : "No cached snapshot is available yet. The scheduled refresh has not produced data."
        : freshness === "stale"
          ? `Snapshot is from ${marketDataAsOf}; latest completed market close was ${latest}.`
          : undefined;

    return {
      ...report,
      marketDataAsOf: marketDataAsOf ?? undefined,
      constituentsAsOf: constituentsAsOf ?? undefined,
      freshness,
      freshnessNote,
    };
  });

function n(v: unknown): number | undefined {
  if (v == null) return undefined;
  const x = typeof v === "string" ? Number(v) : (v as number);
  return typeof x === "number" && Number.isFinite(x) ? x : undefined;
}

function snapshotRowToStockMetrics(row: Record<string, unknown>): StockMetrics {
  const ticker = normalizeTickerForProvider(String(row.ticker));
  const currentPrice = n(row.close_price);
  const high52Week = n(row.fifty_two_week_high);
  const low52Week = n(row.fifty_two_week_low);
  const twoHundredDma = n(row.two_hundred_day_moving_average);
  return {
    ticker,
    marketCapB: n(row.market_cap_b),
    currentPrice,
    high52Week,
    low52Week,
    pricePctFrom52WHigh:
      currentPrice != null && high52Week != null && high52Week > 0
        ? ((currentPrice - high52Week) / high52Week) * 100
        : undefined,
    above200dma:
      currentPrice != null && twoHundredDma != null
        ? currentPrice >= twoHundredDma
        : undefined,
    forwardPE: n(row.forward_pe),
    trailingPE: n(row.trailing_pe),
    evToEbitda: n(row.ev_to_ebitda),
    priceToBook: n(row.price_to_book),
    revenueGrowthPct: n(row.revenue_growth),
    earningsGrowthPct: n(row.earnings_growth),
    operatingMarginPct: n(row.operating_margin),
    grossMarginPct: n(row.gross_margin),
    returnOnEquityPct: n(row.return_on_equity),
    freeCashFlowB: n(row.free_cash_flow_b),
    debtToEquity: n(row.debt_to_equity),
    beta: n(row.beta),
  };
}

function toFilterConfig(request: AnalysisRequest): FilterConfig {
  const s = request.settings;
  return {
    minMarketCapB: s.minMarketCapB,
    minPullbackPct: s.minPullbackPct,
    maxPullbackPct: s.maxPullbackPct,
    minOperatingMarginPct: s.minOperatingMarginPct,
    requirePositiveRevenueGrowth: true,
    requirePositiveFcf: !s.allowNegativeFcf,
    maxDebtToEquity: s.mode === "conservative" ? 1.5 : s.mode === "balanced" ? 2.5 : 4,
    requireAbove200dma: s.requireAbove200dma,
  };
}

function toScoringConfig(request: AnalysisRequest): ScoringConfig {
  const base = { ...DEFAULT_SCORING_WEIGHTS };

  if (request.settings.mode === "conservative") {
    base.operatingMargin *= 1.3;
    base.freeCashFlow *= 1.3;
    base.debtToEquity *= 1.4;
    base.beta *= 1.4;
  } else if (request.settings.mode === "opportunistic") {
    base.drawdownFromHigh *= 1.4;
    base.revenueGrowth *= 1.2;
    base.earningsGrowth *= 1.2;
  }

  return { weights: base, topN: request.settings.topN };
}