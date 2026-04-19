import type {
  FactorScore,
  ScoringConfig,
  ScoringFactor,
  StockMetrics,
} from "./types";
import { FACTOR_BOUNDS } from "./config";

/**
 * Pure scoring functions.
 *
 * The scoring pipeline:
 *   1. Pull each factor's raw value from the metrics.
 *   2. Normalize to 0..1 using FACTOR_BOUNDS (clamped + direction-aware).
 *   3. Apply the configured weight (renormalized so all weights sum to 1).
 *   4. Sum weighted contributions and rescale to 0..100.
 *
 * Missing metrics for a factor are gracefully ignored: that factor's
 * weight is redistributed across the factors that DID have data, so
 * stocks with sparse data aren't unfairly penalized to zero.
 */

const RAW_VALUE_GETTERS: Record<ScoringFactor, (m: StockMetrics) => number | undefined> = {
  forwardPE:        (m) => m.forwardPE,
  trailingPE:       (m) => m.trailingPE,
  evToEbitda:       (m) => m.evToEbitda,
  priceToBook:      (m) => m.priceToBook,
  drawdownFromHigh: (m) =>
    m.pricePctFrom52WHigh == null ? undefined : Math.abs(m.pricePctFrom52WHigh),
  revenueGrowth:    (m) => m.revenueGrowthPct,
  earningsGrowth:   (m) => m.earningsGrowthPct,
  operatingMargin:  (m) => m.operatingMarginPct,
  grossMargin:      (m) => m.grossMarginPct,
  returnOnEquity:   (m) => m.returnOnEquityPct,
  freeCashFlow:     (m) => m.freeCashFlowB,
  debtToEquity:     (m) => m.debtToEquity,
  beta:             (m) => m.beta,
};

/** Map a raw metric value to a 0..1 "goodness" score using its bounds. */
export function normalizeFactor(factor: ScoringFactor, raw: number): number {
  const { min, max, direction } = FACTOR_BOUNDS[factor];
  if (max === min) return 0.5;
  const clamped = Math.min(Math.max(raw, min), max);
  const t = (clamped - min) / (max - min);
  return direction === "higher" ? t : 1 - t;
}

export interface ComputeScoreResult {
  score: number;             // 0..100
  breakdown: FactorScore[];  // entries with renormalized weights
}

/**
 * Compute a stock's score given the configured factor weights.
 * Pure: deterministic given the same inputs.
 */
export function computeScore(metrics: StockMetrics, cfg: ScoringConfig): ComputeScoreResult {
  const factors = Object.keys(cfg.weights) as ScoringFactor[];

  // First pass: collect available factors and their raw weight contributions.
  const present: { factor: ScoringFactor; raw: number; rawWeight: number; norm: number }[] = [];
  let totalRawWeight = 0;

  for (const factor of factors) {
    const w = cfg.weights[factor] ?? 0;
    if (w <= 0) continue;
    const raw = RAW_VALUE_GETTERS[factor](metrics);
    if (raw == null || !Number.isFinite(raw)) continue;
    const norm = normalizeFactor(factor, raw);
    present.push({ factor, raw, rawWeight: w, norm });
    totalRawWeight += w;
  }

  if (totalRawWeight === 0) {
    return { score: 0, breakdown: [] };
  }

  // Second pass: renormalize weights so available factors sum to 1.
  const breakdown: FactorScore[] = present.map((p) => {
    const weight = p.rawWeight / totalRawWeight;
    return {
      factor: p.factor,
      rawValue: p.raw,
      normalized: p.norm,
      weight,
      contribution: p.norm * weight,
    };
  });

  const sum = breakdown.reduce((acc, b) => acc + b.contribution, 0);
  const score = Math.round(sum * 100);
  return { score, breakdown };
}
