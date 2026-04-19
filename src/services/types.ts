/**
 * Core data models for the screening + scoring engine.
 *
 * These shapes are the contract between providers (data sources) and the
 * engine (pure scoring logic). Everything is plain JSON-friendly so it
 * round-trips cleanly through caches, server functions, or APIs.
 */

export interface IndexConstituent {
  ticker: string;
  name: string;
  sector: string;
  weight?: number; // 0..1 within the index
}

/**
 * Snapshot of fundamentals + price metrics for one stock.
 * All numeric fields are optional because real data feeds are sparse;
 * the engine handles `undefined` explicitly rather than imputing values.
 */
export interface StockMetrics {
  ticker: string;

  // Size & liquidity
  marketCapB?: number;        // billions USD

  // Price-relative
  pricePctFrom52WHigh?: number;   // negative number, e.g. -14.2 means 14.2% below 52-wk high
  above200dma?: boolean;

  // Valuation
  forwardPE?: number;
  trailingPE?: number;
  evToEbitda?: number;
  priceToBook?: number;

  // Growth
  revenueGrowthPct?: number;       // YoY %, e.g. 8.5
  earningsGrowthPct?: number;      // YoY %

  // Profitability
  operatingMarginPct?: number;
  grossMarginPct?: number;
  returnOnEquityPct?: number;

  // Cash & balance sheet
  freeCashFlowB?: number;          // billions USD, can be negative
  debtToEquity?: number;           // ratio (e.g. 1.2)

  // Risk
  beta?: number;
}

/* -------------------------------------------------------------------- */
/* Filter configuration                                                 */
/* -------------------------------------------------------------------- */

export interface FilterConfig {
  minMarketCapB: number;
  minPullbackPct: number;     // e.g. 8 (positive number, meaning "at least 8% off high")
  maxPullbackPct: number;     // e.g. 35
  minOperatingMarginPct: number;
  requirePositiveRevenueGrowth: boolean;
  requirePositiveFcf: boolean;       // if true, FCF must be > 0
  maxDebtToEquity: number;           // e.g. 2.5
  requireAbove200dma: boolean;
}

/* -------------------------------------------------------------------- */
/* Scoring configuration                                                */
/* -------------------------------------------------------------------- */

export type ScoringFactor =
  | "forwardPE"
  | "trailingPE"
  | "evToEbitda"
  | "priceToBook"
  | "drawdownFromHigh"
  | "revenueGrowth"
  | "earningsGrowth"
  | "operatingMargin"
  | "grossMargin"
  | "returnOnEquity"
  | "freeCashFlow"
  | "debtToEquity"
  | "beta";

/** Each factor's weight is a non-negative number; the engine normalizes. */
export type ScoringWeights = Record<ScoringFactor, number>;

export interface ScoringConfig {
  weights: ScoringWeights;
  topN: number;
}

/* -------------------------------------------------------------------- */
/* Rejection model — deterministic, machine-readable codes              */
/* -------------------------------------------------------------------- */

export type RejectionCode =
  | "MISSING_METRICS"
  | "MARKET_CAP_TOO_SMALL"
  | "INSUFFICIENT_PULLBACK"
  | "EXCESSIVE_PULLBACK"
  | "NEGATIVE_REVENUE_GROWTH"
  | "NEGATIVE_OPERATING_MARGIN"
  | "NEGATIVE_FCF"
  | "EXCESSIVE_LEVERAGE"
  | "BELOW_200DMA";

export interface RejectionDetail {
  code: RejectionCode;
  message: string;        // plain-English reason
}

export interface RejectedStock {
  ticker: string;
  name: string;
  sector: string;
  reasons: RejectionDetail[];   // ordered by severity (first listed first)
}

/* -------------------------------------------------------------------- */
/* Per-factor scoring breakdown — used for explainability               */
/* -------------------------------------------------------------------- */

export interface FactorScore {
  factor: ScoringFactor;
  rawValue: number | undefined;     // raw metric value
  normalized: number;               // 0..1, higher = better
  weight: number;                   // normalized weight (sums to 1)
  contribution: number;             // normalized * weight
}

export interface RankedStock {
  rank: number;
  ticker: string;
  name: string;
  sector: string;
  metrics: StockMetrics;
  score: number;                    // 0..100
  factorBreakdown: FactorScore[];
  passReasons: string[];            // plain-English bullets
  pullbackPct: number;              // convenience (negative number)
}

/* -------------------------------------------------------------------- */
/* Engine I/O                                                           */
/* -------------------------------------------------------------------- */

export interface EngineInput {
  constituents: IndexConstituent[];
  metrics: StockMetrics[];          // keyed by ticker
  filters: FilterConfig;
  scoring: ScoringConfig;
}

export interface EngineSummary {
  constituentsScanned: number;
  metricsAvailable: number;
  passedCount: number;
  rejectedCount: number;
  topCount: number;
}

export interface EngineResult {
  passed: RankedStock[];           // all survivors, sorted by score desc
  ranked: RankedStock[];           // top N (subset of passed)
  rejected: RejectedStock[];
  summary: EngineSummary;
}
