import type {
  FilterConfig,
  ScoringConfig,
  ScoringWeights,
} from "./types";

/**
 * Centralized engine configuration.
 *
 * All thresholds and weights live here so that tuning the screen does not
 * require touching the engine code. Keep this file the single source of
 * truth for "what the agent considers a good stock".
 */

export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  minMarketCapB: 25,
  minPullbackPct: 8,
  maxPullbackPct: 35,
  minOperatingMarginPct: 0,        // engine treats this as "must be > this value"
  requirePositiveRevenueGrowth: true,
  requirePositiveFcf: false,
  maxDebtToEquity: 2.5,
  requireAbove200dma: false,
};

/**
 * Default factor weights. Higher = more influence on the final score.
 * The engine normalizes these so absolute values don't need to sum to 1.
 *
 * Bias: quality + value blend, with a healthy nudge toward pullback depth.
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  // Valuation (cheaper = better)
  forwardPE: 1.2,
  trailingPE: 0.6,
  evToEbitda: 1.0,
  priceToBook: 0.5,

  // Pullback (deeper = more opportunity, capped at maxPullbackPct)
  drawdownFromHigh: 1.4,

  // Growth
  revenueGrowth: 0.9,
  earningsGrowth: 0.8,

  // Profitability / quality
  operatingMargin: 1.2,
  grossMargin: 0.7,
  returnOnEquity: 1.0,

  // Cash & balance sheet
  freeCashFlow: 1.0,
  debtToEquity: 0.6,

  // Risk
  beta: 0.4,
};

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: DEFAULT_SCORING_WEIGHTS,
  topN: 10,
};

/**
 * Per-factor normalization bounds. Each factor maps a raw metric into
 * a 0..1 "goodness" score using these bounds. Values outside the band
 * are clamped, then mapped linearly.
 *
 * `direction: "lower"` means lower raw values score higher (e.g. P/E).
 * `direction: "higher"` means higher raw values score higher (e.g. ROE).
 */
export type FactorDirection = "lower" | "higher";

export interface FactorBounds {
  min: number;
  max: number;
  direction: FactorDirection;
}

export const FACTOR_BOUNDS: Record<keyof ScoringWeights, FactorBounds> = {
  forwardPE:        { min: 8,    max: 40,   direction: "lower"  },
  trailingPE:       { min: 8,    max: 45,   direction: "lower"  },
  evToEbitda:       { min: 6,    max: 30,   direction: "lower"  },
  priceToBook:      { min: 0.8,  max: 12,   direction: "lower"  },
  drawdownFromHigh: { min: 5,    max: 35,   direction: "higher" }, // expressed as |pullback %|
  revenueGrowth:    { min: -5,   max: 30,   direction: "higher" },
  earningsGrowth:   { min: -10,  max: 35,   direction: "higher" },
  operatingMargin:  { min: 0,    max: 45,   direction: "higher" },
  grossMargin:      { min: 20,   max: 80,   direction: "higher" },
  returnOnEquity:   { min: 5,    max: 40,   direction: "higher" },
  freeCashFlow:     { min: -2,   max: 50,   direction: "higher" }, // billions USD
  debtToEquity:     { min: 0,    max: 2.5,  direction: "lower"  },
  beta:             { min: 0.6,  max: 1.6,  direction: "lower"  },
};
