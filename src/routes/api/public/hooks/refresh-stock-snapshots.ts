import { createFileRoute } from "@tanstack/react-router";
import {
  FinnhubFundamentalsProvider,
  YahooFundamentalsProvider,
} from "@/services";
import { normalizeTickerForProvider } from "@/services/symbolNormalization";
import type { StockMetrics } from "@/services/types";
import { getLatestCompletedTradingDay } from "@/lib/marketCalendar";

function isAuthorized(request: Request): boolean {
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!supabaseKey) return true;
  const apikey = request.headers.get("apikey") ?? request.headers.get("x-apikey");
  return apikey === supabaseKey;
}

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

export const Route = createFileRoute("/api/public/hooks/refresh-stock-snapshots")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorized(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const apiKey = process.env.FINNHUB_API_KEY ?? "";

        const startedAt = new Date().toISOString();
        const tradeDate = getLatestCompletedTradingDay();

        // 1) Pull active constituents across all supported indexes, dedupe by ticker
        const { data: rows, error: cErr } = await supabaseAdmin
          .from("index_constituents")
          .select("ticker, company_name, sector, index_symbol")
          .eq("is_active", true);

        if (cErr) {
          await supabaseAdmin.from("refresh_job_logs").insert({
            job_name: "refreshDailyStockSnapshots",
            status: "error",
            started_at: startedAt,
            completed_at: new Date().toISOString(),
            records_processed: 0,
            records_failed: 0,
            error_message: cErr.message,
          });
          return new Response(JSON.stringify({ error: cErr.message }), { status: 500 });
        }

        const tickerMap = new Map<string, { name?: string; sector?: string }>();
        for (const r of rows ?? []) {
          const t = normalizeTickerForProvider(r.ticker);
          if (!tickerMap.has(t)) {
            tickerMap.set(t, { name: r.company_name ?? undefined, sector: r.sector ?? undefined });
          }
        }
        const tickers = [...tickerMap.keys()];

        if (tickers.length === 0) {
          await supabaseAdmin.from("refresh_job_logs").insert({
            job_name: "refreshDailyStockSnapshots",
            status: "error",
            started_at: startedAt,
            completed_at: new Date().toISOString(),
            records_processed: 0,
            records_failed: 0,
            error_message: "No active constituents — run refreshIndexConstituents first.",
          });
          return new Response(JSON.stringify({ error: "no_constituents" }), { status: 400 });
        }

        // 2) Fetch in parallel from both providers
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

        // 3) Build snapshot rows
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
              continue;
            }
            // Finnhub wins; Yahoo fills gaps.
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
            console.error(`snapshot row build failed for ${ticker}:`, err);
          }
        }

        // 4) Upsert in chunks (avoid oversized payloads)
        const CHUNK = 100;
        for (let i = 0; i < snapshotRows.length; i += CHUNK) {
          const chunk = snapshotRows.slice(i, i + CHUNK);
          const { error } = await supabaseAdmin
            .from("stock_daily_snapshots")
            .upsert(chunk, { onConflict: "ticker,trade_date" });
          if (error) {
            console.error("snapshot upsert chunk failed:", error);
            failed += chunk.length;
            processed -= chunk.length;
          }
        }

        const status = failed === 0 && processed > 0 ? "success" : processed > 0 ? "partial" : "error";
        await supabaseAdmin.from("refresh_job_logs").insert({
          job_name: "refreshDailyStockSnapshots",
          status,
          started_at: startedAt,
          completed_at: new Date().toISOString(),
          records_processed: processed,
          records_failed: failed,
          metadata_json: { tradeDate, tickerCount: tickers.length },
        });

        return new Response(
          JSON.stringify({ status, processed, failed, tradeDate, tickerCount: tickers.length }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
      GET: async () =>
        new Response("Use POST to trigger refresh.", { status: 405 }),
    },
  },
});