import type {
  EngineInput,
  EngineResult,
  RankedStock,
  RejectedStock,
  StockMetrics,
  IndexConstituent,
} from "./types";
import { runFilters } from "./filters";
import { computeScore } from "./scoring";
import { buildPassReasons, buildPassSummary } from "./explanations";

/**
 * Pure scoring engine entry point.
 *
 * Takes constituents + metrics + config, returns ranked / rejected /
 * summary in one call. No I/O, no side effects, fully deterministic —
 * trivial to unit-test.
 */
export function runScoringEngine(input: EngineInput): EngineResult {
  const { constituents, metrics, filters, scoring } = input;
  const metricsByTicker = new Map<string, StockMetrics>(
    metrics.map((m) => [m.ticker.toUpperCase(), m]),
  );

  const passed: RankedStock[] = [];
  const rejected: RejectedStock[] = [];

  for (const c of constituents) {
    const m = metricsByTicker.get(c.ticker.toUpperCase());

    // No metrics at all → reject with MISSING_METRICS.
    if (!m) {
      rejected.push({
        ticker: c.ticker,
        name: c.name,
        sector: c.sector,
        reasons: [
          {
            code: "MISSING_METRICS",
            message: "No fundamentals available for this stock.",
          },
        ],
      });
      continue;
    }

    const reasons = runFilters(m, filters);
    if (reasons.length > 0) {
      rejected.push({
        ticker: c.ticker,
        name: c.name,
        sector: c.sector,
        reasons,
      });
      continue;
    }

    const { score, breakdown } = computeScore(m, scoring);
    passed.push({
      rank: 0, // assigned after sort
      ticker: c.ticker,
      name: c.name,
      sector: c.sector,
      metrics: m,
      score,
      factorBreakdown: breakdown,
      passReasons: [
        buildPassSummary(c.name, m),
        ...buildPassReasons(m, breakdown),
      ],
      pullbackPct: m.pricePctFrom52WHigh ?? 0,
    });
  }

  // Stable sort: score desc, then ticker asc to keep ties deterministic.
  passed.sort((a, b) => (b.score - a.score) || a.ticker.localeCompare(b.ticker));
  passed.forEach((p, i) => (p.rank = i + 1));

  const ranked = passed.slice(0, scoring.topN);

  return {
    passed,
    ranked,
    rejected,
    summary: {
      constituentsScanned: constituents.length,
      metricsAvailable: metrics.length,
      passedCount: passed.length,
      rejectedCount: rejected.length,
      topCount: ranked.length,
    },
  };
}

/* Helper used by the orchestration layer. */
export function constituentsToTickers(c: IndexConstituent[]): string[] {
  return c.map((x) => x.ticker);
}
