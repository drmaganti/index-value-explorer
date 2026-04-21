import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import type { AnalysisRequest } from "./types";
import type { StockMetrics, YahooSupplementalMetrics } from "@/services";
import {
  buildReportFromEngine,
  constituentsToTickers,
  FinnhubFundamentalsProvider,
  FinnhubIndexProvider,
  YahooFundamentalsProvider,
  runScoringEngine,
  type FilterConfig,
  type ScoringConfig,
  DEFAULT_SCORING_WEIGHTS,
} from "@/services";
import { normalizeTickerForProvider } from "@/services/symbolNormalization";

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
    const apiKey = process.env.FINNHUB_API_KEY;

    if (!apiKey) {
      throw new Error("Market data provider key is not configured.");
    }

    const request: AnalysisRequest = {
      symbol: data.symbol.trim().toUpperCase(),
      settings: data.settings,
    };

    const indexProvider = new FinnhubIndexProvider(apiKey);
    const fundamentalsProvider = new FinnhubFundamentalsProvider(apiKey);
    const yahooProvider = new YahooFundamentalsProvider();

    const constituents = await indexProvider.getConstituents(request.symbol);
    const tickers = constituentsToTickers(constituents);
    const [metrics, supplemental] = await Promise.all([
      fundamentalsProvider.getMetrics(tickers),
      yahooProvider.getSupplementalMetrics(tickers),
    ]);

    const enrichedMetrics = mergeFundamentals(tickers, metrics, supplemental);

    const engineResult = runScoringEngine({
      constituents,
      metrics: enrichedMetrics,
      filters: toFilterConfig(request),
      scoring: toScoringConfig(request),
    });

    return buildReportFromEngine(request, engineResult);
  });

/**
 * Merge Finnhub primary metrics with Yahoo supplemental metrics.
 *
 * - Finnhub fields take precedence; Yahoo only fills `undefined` slots.
 * - When Finnhub returned nothing for a ticker but Yahoo did, we synthesize
 *   a Yahoo-only StockMetrics so the ticker can still be screened on the
 *   core fields (price + market cap + 52W context).
 * - Tickers are matched after symbol normalization (BRK.B → BRK-B) so the
 *   index list, both providers, and the engine all key consistently.
 */
function mergeFundamentals(
  requestedTickers: string[],
  finnhub: StockMetrics[],
  yahoo: YahooSupplementalMetrics[],
): StockMetrics[] {
  const finnhubByTicker = new Map<string, StockMetrics>(
    finnhub.map((m) => [normalizeTickerForProvider(m.ticker), m]),
  );
  const yahooByTicker = new Map<string, YahooSupplementalMetrics>(
    yahoo.map((m) => [normalizeTickerForProvider(m.ticker), m]),
  );

  const merged: StockMetrics[] = [];
  const seen = new Set<string>();

  for (const rawTicker of requestedTickers) {
    const ticker = normalizeTickerForProvider(rawTicker);
    if (seen.has(ticker)) continue;
    seen.add(ticker);

    const fh = finnhubByTicker.get(ticker);
    const yh = yahooByTicker.get(ticker);

    if (!fh && !yh) continue; // both providers failed → engine will mark MISSING_METRICS

    if (fh && yh) {
      merged.push({
        ...fh,
        ticker,
        marketCapB: fh.marketCapB ?? yh.marketCapB,
        currentPrice: fh.currentPrice ?? yh.currentPrice,
        high52Week: fh.high52Week ?? yh.high52Week,
        low52Week: fh.low52Week ?? yh.low52Week,
        pricePctFrom52WHigh: fh.pricePctFrom52WHigh ?? yh.pricePctFrom52WHigh,
        above200dma: fh.above200dma ?? yh.above200dma,
        evToEbitda: fh.evToEbitda ?? yh.evToEbitda,
        freeCashFlowB: fh.freeCashFlowB ?? yh.freeCashFlowB,
      });
      continue;
    }

    if (fh) {
      merged.push({ ...fh, ticker });
      continue;
    }

    // Yahoo-only fallback when Finnhub returned nothing.
    merged.push({
      ticker,
      marketCapB: yh!.marketCapB,
      currentPrice: yh!.currentPrice,
      high52Week: yh!.high52Week,
      low52Week: yh!.low52Week,
      pricePctFrom52WHigh: yh!.pricePctFrom52WHigh,
      above200dma: yh!.above200dma,
      evToEbitda: yh!.evToEbitda,
      freeCashFlowB: yh!.freeCashFlowB,
    });
  }

  return merged;
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