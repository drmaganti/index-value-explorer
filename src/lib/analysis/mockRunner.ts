import type {
  AnalysisReport,
  AnalysisRequest,
  AnalysisStep,
  AnalysisStepId,
} from "./types";
import { INITIAL_STEPS } from "./defaults";
import {
  buildReportFromEngine,
  constituentsToTickers,
  DEFAULT_SCORING_WEIGHTS,
  mockFundamentalsProvider,
  mockIndexProvider,
  runScoringEngine,
  type FilterConfig,
  type FundamentalsProvider,
  type IndexProvider,
  type ScoringConfig,
} from "@/services";

/**
 * Orchestration layer.
 *
 * Wires the UI's AnalysisRequest -> services pipeline -> AnalysisReport,
 * walking through the visible step states with realistic-feeling timing.
 *
 * Providers are injectable so tests / future real backends can replace
 * the mock implementations without touching this file.
 */

const STEP_DURATIONS_MS: Record<AnalysisStepId, number> = {
  fetch_constituents: 800,
  gather_fundamentals: 1400,
  apply_filters: 900,
  rank_candidates: 1100,
  build_report: 600,
};

export interface RunHandle {
  cancel: () => void;
}

export interface RunCallbacks {
  onStep: (steps: AnalysisStep[]) => void;
  onComplete: (report: AnalysisReport) => void;
  onError: (message: string, steps: AnalysisStep[]) => void;
}

export interface RunDeps {
  indexProvider?: IndexProvider;
  fundamentalsProvider?: FundamentalsProvider;
}

export function runMockAnalysis(
  request: AnalysisRequest,
  callbacks: RunCallbacks,
  deps: RunDeps = {},
): RunHandle {
  const indexProvider = deps.indexProvider ?? mockIndexProvider;
  const fundamentalsProvider =
    deps.fundamentalsProvider ?? mockFundamentalsProvider;

  let cancelled = false;
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  const steps: AnalysisStep[] = INITIAL_STEPS.map((s) => ({ ...s }));

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = setTimeout(resolve, ms);
      timeouts.push(t);
    });

  const setStepStatus = (idx: number, status: AnalysisStep["status"]) => {
    steps[idx] = { ...steps[idx], status };
    callbacks.onStep([...steps]);
  };

  const filters: FilterConfig = toFilterConfig(request);
  const scoring: ScoringConfig = toScoringConfig(request);

  void (async () => {
    try {
      // 1. Fetch constituents
      setStepStatus(0, "active");
      const constituents = await indexProvider.getConstituents(request.symbol);
      await wait(STEP_DURATIONS_MS.fetch_constituents);
      if (cancelled) return;
      setStepStatus(0, "done");

      // 2. Gather fundamentals
      setStepStatus(1, "active");
      const tickers = constituentsToTickers(constituents);
      const metrics = await fundamentalsProvider.getMetrics(tickers);
      await wait(STEP_DURATIONS_MS.gather_fundamentals);
      if (cancelled) return;
      setStepStatus(1, "done");

      // 3. Apply filters (engine handles filters + scoring together,
      //    but we present them as discrete user-facing steps).
      setStepStatus(2, "active");
      await wait(STEP_DURATIONS_MS.apply_filters);
      if (cancelled) return;
      setStepStatus(2, "done");

      // 4. Rank candidates
      setStepStatus(3, "active");
      const engineResult = runScoringEngine({
        constituents,
        metrics,
        filters,
        scoring,
      });
      await wait(STEP_DURATIONS_MS.rank_candidates);
      if (cancelled) return;
      setStepStatus(3, "done");

      // 5. Build report
      setStepStatus(4, "active");
      const report = buildReportFromEngine(request, engineResult);
      await wait(STEP_DURATIONS_MS.build_report);
      if (cancelled) return;
      setStepStatus(4, "done");

      await wait(100);
      if (cancelled) return;
      callbacks.onComplete(report);
    } catch (err) {
      if (cancelled) return;
      const message = err instanceof Error ? err.message : "Unknown error";
      callbacks.onError(message, [...steps]);
    }
  })();

  return {
    cancel: () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Bridge: UI AnalysisRequest -> engine FilterConfig / ScoringConfig. */
/* ------------------------------------------------------------------ */

function toFilterConfig(request: AnalysisRequest): FilterConfig {
  const s = request.settings;
  return {
    minMarketCapB: s.minMarketCapB,
    minPullbackPct: s.minPullbackPct,
    maxPullbackPct: s.maxPullbackPct,
    minOperatingMarginPct: s.minOperatingMarginPct,
    requirePositiveRevenueGrowth: true,
    requirePositiveFcf: !s.allowNegativeFcf,
    maxDebtToEquity: s.mode === "conservative" ? 1.5 : s.mode === "balanced" ? 2.5 : 4.0,
    requireAbove200dma: s.requireAbove200dma,
  };
}

function toScoringConfig(request: AnalysisRequest): ScoringConfig {
  // Mode skews the weights toward different priorities.
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
