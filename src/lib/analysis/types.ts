/**
 * Domain types for the Index Value Agent analysis flow.
 *
 * These shapes are designed so that swapping mock execution for a real
 * backend requires only replacing the runner — nothing in the UI changes.
 */

export const SUPPORTED_SYMBOLS = ["QQQ", "SPY", "DIA"] as const;
export type SupportedSymbol = (typeof SUPPORTED_SYMBOLS)[number];

export type AnalysisMode = "conservative" | "balanced" | "opportunistic";

export interface AnalysisSettings {
  minMarketCapB: number;            // billions USD
  minPullbackPct: number;           // e.g. 8 means ≥ 8% off 52-wk high
  maxPullbackPct: number;           // e.g. 35
  minOperatingMarginPct: number;    // e.g. 10
  allowNegativeFcf: boolean;
  requireAbove200dma: boolean;
  topN: number;                     // 5..25
  mode: AnalysisMode;
}

export interface AnalysisRequest {
  symbol: string;                   // already normalized (uppercased, trimmed)
  settings: AnalysisSettings;
}

export type AnalysisStepId =
  | "fetch_constituents"
  | "gather_fundamentals"
  | "apply_filters"
  | "rank_candidates"
  | "build_report";

export type StepStatus = "pending" | "active" | "done" | "error";

export interface AnalysisStep {
  id: AnalysisStepId;
  label: string;
  detail: string;
  status: StepStatus;
}

export interface RankedCandidate {
  rank: number;
  ticker: string;
  name: string;
  sector: string;
  pullbackPct: number;              // negative number, e.g. -21.4
  score: number;                    // 0..100
  marketCapB?: number;
  currentPrice?: number;
  high52Week?: number;
  low52Week?: number;
  forwardPE?: number;
  revenueGrowthPct?: number;
  operatingMarginPct?: number;
  trailingPE?: number;
  evToEbitda?: number;
  priceToBook?: number;
  earningsGrowthPct?: number;
  grossMarginPct?: number;
  returnOnEquityPct?: number;
  freeCashFlowB?: number;
  debtToEquity?: number;
  beta?: number;
  above200dma?: boolean;
  passReasons: string[];
  factorHighlights: string[];
  hasPartialData: boolean;
  missingDataCount: number;
  factorBreakdown?: FactorContribution[];
}

export interface FactorContribution {
  factor: string;                   // ScoringFactor id
  label: string;                    // human-readable label
  rawValue?: number;
  normalized: number;               // 0..1
  weight: number;                   // 0..1
  contribution: number;             // 0..1
}

export interface RejectedCandidate {
  ticker: string;
  name?: string;
  sector?: string;
  reason: string;
  reasons?: string[];
}

export interface AnalysisSummary {
  constituentsScanned: number;
  passedCount: number;
  rejectedCount: number;
  topCount: number;
  universeName: string;
  metricsAvailable: number;
  dataCompletenessPct: number;
  partialDataCount: number;
}

export interface AnalysisReport {
  id: string;
  request: AnalysisRequest;
  generatedAt: string;              // ISO timestamp
  summary: AnalysisSummary;
  ranked: RankedCandidate[];
  rejected: RejectedCandidate[];
}

export type AnalysisStatus = "idle" | "running" | "success" | "error";

export type AnalysisErrorCode =
  | "INVALID_SYMBOL"
  | "UNSUPPORTED_SYMBOL"
  | "NO_CONSTITUENTS"
  | "PROVIDER_FAILURE"
  | "ANALYSIS_FAILURE";
