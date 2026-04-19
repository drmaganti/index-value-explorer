import type { AnalysisSettings, AnalysisStep } from "./types";

export const DEFAULT_SETTINGS: AnalysisSettings = {
  minMarketCapB: 25,
  minPullbackPct: 8,
  maxPullbackPct: 35,
  minOperatingMarginPct: 10,
  allowNegativeFcf: false,
  requireAbove200dma: false,
  topN: 10,
  mode: "balanced",
};

export const MODE_PRESETS: Record<
  AnalysisSettings["mode"],
  Partial<AnalysisSettings>
> = {
  conservative: {
    minMarketCapB: 50,
    minPullbackPct: 10,
    maxPullbackPct: 25,
    minOperatingMarginPct: 15,
    allowNegativeFcf: false,
    requireAbove200dma: true,
  },
  balanced: {
    minMarketCapB: 25,
    minPullbackPct: 8,
    maxPullbackPct: 35,
    minOperatingMarginPct: 10,
    allowNegativeFcf: false,
    requireAbove200dma: false,
  },
  opportunistic: {
    minMarketCapB: 10,
    minPullbackPct: 15,
    maxPullbackPct: 50,
    minOperatingMarginPct: 5,
    allowNegativeFcf: true,
    requireAbove200dma: false,
  },
};

export const INITIAL_STEPS: AnalysisStep[] = [
  {
    id: "fetch_constituents",
    label: "Fetching constituents",
    detail: "Loading the index's component holdings.",
    status: "pending",
  },
  {
    id: "gather_fundamentals",
    label: "Gathering fundamentals",
    detail: "Pulling margins, growth, balance-sheet metrics.",
    status: "pending",
  },
  {
    id: "apply_filters",
    label: "Applying filters",
    detail: "Screening by market cap, pullback window, and quality.",
    status: "pending",
  },
  {
    id: "rank_candidates",
    label: "Ranking candidates",
    detail: "Blending value and quality into a unified score.",
    status: "pending",
  },
  {
    id: "build_report",
    label: "Building report",
    detail: "Composing the top-ranked output and rationale.",
    status: "pending",
  },
];
