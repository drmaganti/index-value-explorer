import type {
  AnalysisReport,
  AnalysisRequest,
  AnalysisStep,
  AnalysisStepId,
  RankedCandidate,
  RejectedCandidate,
} from "./types";
import { INITIAL_STEPS } from "./defaults";

/**
 * Mock analysis runner.
 *
 * Walks through the configured steps with realistic-feeling timing,
 * emitting the full step array on every transition. The final
 * `onComplete` payload mirrors the shape we'd expect from a real
 * backend so swapping in a real engine later is a one-file change.
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

export function runMockAnalysis(
  request: AnalysisRequest,
  callbacks: RunCallbacks,
): RunHandle {
  let cancelled = false;
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  const steps: AnalysisStep[] = INITIAL_STEPS.map((s) => ({ ...s }));

  const schedule = (ms: number, fn: () => void) => {
    const t = setTimeout(() => {
      if (!cancelled) fn();
    }, ms);
    timeouts.push(t);
  };

  let elapsed = 0;
  steps.forEach((step, i) => {
    schedule(elapsed, () => {
      steps[i] = { ...step, status: "active" };
      callbacks.onStep([...steps]);
    });
    elapsed += STEP_DURATIONS_MS[step.id];
    schedule(elapsed, () => {
      steps[i] = { ...step, status: "done" };
      callbacks.onStep([...steps]);
    });
  });

  schedule(elapsed + 100, () => {
    callbacks.onComplete(buildMockReport(request));
  });

  return {
    cancel: () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    },
  };
}

/* ---------------------------------------------------------------- */
/* Mock report builder — shape-compatible with future real backend. */
/* ---------------------------------------------------------------- */

const BASE_RANKED: Omit<RankedCandidate, "rank">[] = [
  { ticker: "ADBE", name: "Adobe Inc.", sector: "Software", pullbackPct: -21.4, score: 92 },
  { ticker: "GOOGL", name: "Alphabet Inc.", sector: "Communication", pullbackPct: -16.8, score: 89 },
  { ticker: "AMD", name: "Advanced Micro Devices", sector: "Semiconductors", pullbackPct: -27.1, score: 86 },
  { ticker: "PEP", name: "PepsiCo Inc.", sector: "Consumer Staples", pullbackPct: -18.2, score: 84 },
  { ticker: "TXN", name: "Texas Instruments", sector: "Semiconductors", pullbackPct: -15.6, score: 83 },
  { ticker: "INTU", name: "Intuit Inc.", sector: "Software", pullbackPct: -19.0, score: 81 },
  { ticker: "QCOM", name: "Qualcomm Inc.", sector: "Semiconductors", pullbackPct: -22.5, score: 79 },
  { ticker: "MDLZ", name: "Mondelez International", sector: "Consumer Staples", pullbackPct: -17.3, score: 77 },
  { ticker: "BKNG", name: "Booking Holdings", sector: "Travel", pullbackPct: -15.9, score: 76 },
  { ticker: "AMAT", name: "Applied Materials", sector: "Semiconductors", pullbackPct: -24.1, score: 74 },
  { ticker: "CSCO", name: "Cisco Systems", sector: "Networking", pullbackPct: -12.8, score: 72 },
  { ticker: "AMGN", name: "Amgen Inc.", sector: "Biotech", pullbackPct: -14.2, score: 70 },
];

const BASE_REJECTED: RejectedCandidate[] = [
  { ticker: "TSLA", reason: "Valuation premium too high" },
  { ticker: "NFLX", reason: "Insufficient pullback" },
  { ticker: "MRNA", reason: "Earnings instability" },
  { ticker: "PYPL", reason: "Quality score below threshold" },
  { ticker: "WBD", reason: "Balance-sheet leverage" },
];

function buildMockReport(request: AnalysisRequest): AnalysisReport {
  const { settings, symbol } = request;

  // Apply settings to the mock dataset so the output reflects user choices.
  const filtered = BASE_RANKED.filter((c) => {
    const pb = Math.abs(c.pullbackPct);
    return pb >= settings.minPullbackPct && pb <= settings.maxPullbackPct;
  });

  const ranked: RankedCandidate[] = filtered
    .slice(0, settings.topN)
    .map((c, i) => ({ ...c, rank: i + 1 }));

  const constituentsScanned = symbol === "SPY" ? 500 : symbol === "DIA" ? 30 : 100;

  return {
    id: `mock-${Date.now()}`,
    request,
    generatedAt: new Date().toISOString(),
    summary: {
      constituentsScanned,
      candidatesOnPullback: filtered.length + BASE_REJECTED.length,
      topCount: ranked.length,
    },
    ranked,
    rejected: BASE_REJECTED,
  };
}
