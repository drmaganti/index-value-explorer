import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import type { AnalysisRequest } from "./types";
import { buildReportFromEngine, constituentsToTickers, FinnhubFundamentalsProvider, FinnhubIndexProvider, runScoringEngine, type FilterConfig, type ScoringConfig, DEFAULT_SCORING_WEIGHTS } from "@/services";

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

    const constituents = await indexProvider.getConstituents(request.symbol);
    const metrics = await fundamentalsProvider.getMetrics(constituentsToTickers(constituents));

    const engineResult = runScoringEngine({
      constituents,
      metrics,
      filters: toFilterConfig(request),
      scoring: toScoringConfig(request),
    });

    return buildReportFromEngine(request, engineResult);
  });

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