import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type {
  AnalysisErrorCode,
  AnalysisReport,
  AnalysisRequest,
  AnalysisStatus,
  AnalysisStep,
} from "@/lib/analysis/types";
import { INITIAL_STEPS } from "@/lib/analysis/defaults";
import { runAnalysis } from "@/lib/analysis/analysis.functions";

const STEP_SEQUENCE_DELAYS = [150, 400, 700, 950] as const;

interface RunHandle {
  cancel: () => void;
}

interface UseAnalysisRunResult {
  status: AnalysisStatus;
  steps: AnalysisStep[];
  report: AnalysisReport | null;
  errorCode: AnalysisErrorCode | null;
  errorMessage: string | null;
  start: (request: AnalysisRequest) => void;
  cancel: () => void;
  reset: () => void;
}

export function useAnalysisRun(
  onComplete?: (report: AnalysisReport) => void,
): UseAnalysisRunResult {
  const runAnalysisFn = useServerFn(runAnalysis);
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [steps, setSteps] = useState<AnalysisStep[]>(() =>
    INITIAL_STEPS.map((s) => ({ ...s })),
  );
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [errorCode, setErrorCode] = useState<AnalysisErrorCode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handleRef = useRef<RunHandle | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const cancel = useCallback(() => {
    handleRef.current?.cancel();
    handleRef.current = null;
    clearTimers();
    setStatus("idle");
  }, [clearTimers]);

  const reset = useCallback(() => {
    cancel();
    setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
    setReport(null);
    setErrorCode(null);
    setErrorMessage(null);
  }, [cancel]);

  const start = useCallback(
    (request: AnalysisRequest) => {
      cancel();
      setStatus("running");
      setReport(null);
      setErrorCode(null);
      setErrorMessage(null);
      setSteps(INITIAL_STEPS.map((s) => ({ ...s })));

       clearTimers();

      const stepSnapshots = INITIAL_STEPS.map((s) => ({ ...s }));
      const updateStep = (stepIndex: number, statusValue: AnalysisStep["status"]) => {
        stepSnapshots[stepIndex] = { ...stepSnapshots[stepIndex], status: statusValue };
        setSteps([...stepSnapshots]);
      };

      updateStep(0, "active");
      STEP_SEQUENCE_DELAYS.forEach((delay, index) => {
        const timeout = setTimeout(() => {
          updateStep(index, "done");
          updateStep(index + 1, "active");
        }, delay);
        timeoutsRef.current.push(timeout);
      });

      let cancelled = false;

      handleRef.current = {
        cancel: () => {
          cancelled = true;
        },
      };

      void runAnalysisFn({ data: request })
        .then((result) => {
          if (cancelled) return;
          clearTimers();
          const completedSteps = stepSnapshots.map((step) => ({ ...step, status: "done" as const }));
          setSteps(completedSteps);
          setReport(result);
          setStatus("success");
          onComplete?.(result);
        })
        .catch((error) => {
          if (cancelled) return;
          clearTimers();
          const message = error instanceof Error ? error.message : "Unknown error";
          const code = classifyError(message, request.symbol);
          const activeIndex = stepSnapshots.findIndex((step) => step.status === "active");
          if (activeIndex >= 0) {
            updateStep(activeIndex, "error");
          }
          setErrorCode(code);
          setErrorMessage(message);
          setStatus("error");
        });
    },
    [cancel, clearTimers, onComplete, runAnalysisFn],
  );

  useEffect(() => () => cancel(), [cancel]);

  return { status, steps, report, errorCode, errorMessage, start, cancel, reset };
}

function classifyError(message: string, symbol: string): AnalysisErrorCode {
  const lower = message.toLowerCase();
  if (!symbol.trim()) return "INVALID_SYMBOL";
  if (lower.includes("unsupported index symbol")) return "UNSUPPORTED_SYMBOL";
  if (lower.includes("no constituents")) return "NO_CONSTITUENTS";
  if (lower.includes("provider") || lower.includes("finnhub") || lower.includes("market data")) {
    return "PROVIDER_FAILURE";
  }
  return "ANALYSIS_FAILURE";
}
