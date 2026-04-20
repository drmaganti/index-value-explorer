import type { EngineResult } from "./types";
import type { AnalysisRequest, AnalysisReport } from "@/lib/analysis/types";

/**
 * Bridge between the pure scoring engine and the UI's AnalysisReport
 * shape. Keeps the engine output shape free of UI-specific concerns
 * while ensuring the existing results page consumes it without changes.
 */
export function buildReportFromEngine(
  request: AnalysisRequest,
  engine: EngineResult,
): AnalysisReport {
  const universeName = indexLabel(request.symbol);
  const ranked = engine.ranked.map((r) => {
    const missingDataCount = countMissingFields([
      r.metrics.currentPrice,
      r.metrics.high52Week,
      r.metrics.low52Week,
      r.metrics.forwardPE,
      r.metrics.trailingPE,
      r.metrics.evToEbitda,
      r.metrics.priceToBook,
      r.metrics.revenueGrowthPct,
      r.metrics.earningsGrowthPct,
      r.metrics.operatingMarginPct,
      r.metrics.grossMarginPct,
      r.metrics.returnOnEquityPct,
      r.metrics.freeCashFlowB,
      r.metrics.debtToEquity,
      r.metrics.beta,
    ]);

    return {
      rank: r.rank,
      ticker: r.ticker,
      name: r.name,
      sector: r.sector,
      pullbackPct: r.pullbackPct,
      score: r.score,
      marketCapB: r.metrics.marketCapB,
      currentPrice: r.metrics.currentPrice,
      high52Week: r.metrics.high52Week,
      low52Week: r.metrics.low52Week,
      forwardPE: r.metrics.forwardPE,
      revenueGrowthPct: r.metrics.revenueGrowthPct,
      operatingMarginPct: r.metrics.operatingMarginPct,
      trailingPE: r.metrics.trailingPE,
      evToEbitda: r.metrics.evToEbitda,
      priceToBook: r.metrics.priceToBook,
      earningsGrowthPct: r.metrics.earningsGrowthPct,
      grossMarginPct: r.metrics.grossMarginPct,
      returnOnEquityPct: r.metrics.returnOnEquityPct,
      freeCashFlowB: r.metrics.freeCashFlowB,
      debtToEquity: r.metrics.debtToEquity,
      beta: r.metrics.beta,
      above200dma: r.metrics.above200dma,
      passReasons: r.passReasons,
      factorHighlights: r.passReasons.slice(1),
      hasPartialData: missingDataCount > 0,
      missingDataCount,
    };
  });
  const partialDataCount = ranked.filter((stock) => stock.hasPartialData).length;

  return {
    id: `report-${Date.now()}`,
    request,
    generatedAt: new Date().toISOString(),
    summary: {
      constituentsScanned: engine.summary.constituentsScanned,
      passedCount: engine.summary.passedCount,
      rejectedCount: engine.summary.rejectedCount,
      topCount: engine.summary.topCount,
      universeName,
      metricsAvailable: engine.summary.metricsAvailable,
      dataCompletenessPct: Math.round(
        (engine.summary.metricsAvailable / Math.max(engine.summary.constituentsScanned, 1)) * 100,
      ),
      partialDataCount,
    },
    ranked,
    rejected: engine.rejected.map((r) => ({
      ticker: r.ticker,
      name: r.name,
      sector: r.sector,
      // Use the first (most severe) reason for the existing UI shape.
      reason: r.reasons[0]?.message ?? "Did not pass filters.",
      reasons: r.reasons.map((reason) => reason.message),
    })),
  };
}

function countMissingFields(values: Array<number | boolean | undefined>): number {
  return values.filter((value) => value == null).length;
}

function indexLabel(symbol: string): string {
  switch (symbol) {
    case "QQQ":
      return "Nasdaq-100 ETF";
    case "SPY":
      return "S&P 500 ETF";
    case "DIA":
      return "Dow Jones 30 ETF";
    default:
      return `${symbol} universe`;
  }
}
