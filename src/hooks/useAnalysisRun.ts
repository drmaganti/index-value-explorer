import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AnalysisReport,
  AnalysisRequest,
  AnalysisStatus,
  AnalysisStep,
} from "@/lib/analysis/types";
import { INITIAL_STEPS } from "@/lib/analysis/defaults";
import { runMockAnalysis, type RunHandle } from "@/lib/analysis/mockRunner";

interface UseAnalysisRunResult {
  status: AnalysisStatus;
  steps: AnalysisStep[];
  report: AnalysisReport | null;
  errorMessage: string | null;
  start: (request: AnalysisRequest) => void;
  cancel: () => void;
  reset: () => void;
}

export function useAnalysisRun(
  onComplete?: (report: AnalysisReport) => void,
): UseAnalysisRunResult {
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [steps, setSteps] = useState<AnalysisStep[]>(() =>
    INITIAL_STEPS.map((s) => ({ ...s })),
  );
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handleRef = useRef<RunHandle | null>(null);

  const cancel = useCallback(() => {
    handleRef.current?.cancel();
    handleRef.current = null;
  }, []);

  const reset = useCallback(() => {
    cancel();
    setStatus("idle");
    setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
    setReport(null);
    setErrorMessage(null);
  }, [cancel]);

  const start = useCallback(
    (request: AnalysisRequest) => {
      cancel();
      setStatus("running");
      setReport(null);
      setErrorMessage(null);
      setSteps(INITIAL_STEPS.map((s) => ({ ...s })));

      handleRef.current = runMockAnalysis(request, {
        onStep: (next) => setSteps(next),
        onComplete: (result) => {
          setReport(result);
          setStatus("success");
          onComplete?.(result);
        },
        onError: (message, lastSteps) => {
          setSteps(lastSteps);
          setErrorMessage(message);
          setStatus("error");
        },
      });
    },
    [cancel, onComplete],
  );

  useEffect(() => () => cancel(), [cancel]);

  return { status, steps, report, errorMessage, start, cancel, reset };
}
