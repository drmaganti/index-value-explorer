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
  return {
    id: `report-${Date.now()}`,
    request,
    generatedAt: new Date().toISOString(),
    summary: {
      constituentsScanned: engine.summary.constituentsScanned,
      candidatesOnPullback: engine.summary.passedCount + engine.summary.rejectedCount,
      topCount: engine.summary.topCount,
    },
    ranked: engine.ranked.map((r) => ({
      rank: r.rank,
      ticker: r.ticker,
      name: r.name,
      sector: r.sector,
      pullbackPct: r.pullbackPct,
      score: r.score,
    })),
    rejected: engine.rejected.map((r) => ({
      ticker: r.ticker,
      // Use the first (most severe) reason for the existing UI shape.
      reason: r.reasons[0]?.message ?? "Did not pass filters.",
    })),
  };
}
