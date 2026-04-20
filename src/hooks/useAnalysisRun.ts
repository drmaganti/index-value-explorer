import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AnalysisErrorCode,
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
  errorCode: AnalysisErrorCode | null;
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
  const [errorCode, setErrorCode] = useState<AnalysisErrorCode | null>(null);
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

      handleRef.current = runMockAnalysis(request, {
        onStep: (next) => setSteps(next),
        onComplete: (result) => {
          setReport(result);
          setStatus("success");
          onComplete?.(result);
        },
        onError: (code, message, lastSteps) => {
          setSteps(lastSteps);
          setErrorCode(code);
          setErrorMessage(message);
          setStatus("error");
        },
      });
    },
    [cancel, onComplete],
  );

  useEffect(() => () => cancel(), [cancel]);

  return { status, steps, report, errorCode, errorMessage, start, cancel, reset };
}
