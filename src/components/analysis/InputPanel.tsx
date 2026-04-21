import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, Info, Play } from "lucide-react";
import type { AnalysisSettings } from "@/lib/analysis/types";
import { SUPPORTED_SYMBOLS } from "@/lib/analysis/types";
import { DEFAULT_SETTINGS } from "@/lib/analysis/defaults";
import { validateRequest, type FieldErrors } from "@/lib/analysis/validation";
import { setLastReport } from "@/lib/analysis/reportStore";
import { useAnalysisRun } from "@/hooks/useAnalysisRun";
import { AdvancedSettingsAccordion } from "./AdvancedSettingsAccordion";
import { ProgressPanel } from "./ProgressPanel";
import { ErrorState } from "@/components/common/ErrorState";

export function InputPanel() {
  const navigate = useNavigate();
  const [symbol, setSymbol] = useState<string>("QQQ");
  const [settings, setSettings] = useState<AnalysisSettings>(DEFAULT_SETTINGS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const { status, steps, errorCode, errorMessage, start, cancel, reset } = useAnalysisRun(
    (report) => {
      setLastReport(report);
      // Slight delay so the user sees the final "complete" tick.
      setTimeout(() => {
        navigate({ to: "/results" });
      }, 350);
    },
  );

  const liveErrors = useMemo<FieldErrors>(() => {
    if (!submitted) return {};
    return validateRequest(symbol, settings).errors;
  }, [symbol, settings, submitted]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const result = validateRequest(symbol, settings);
    setErrors(result.errors);
    if (!result.ok || !result.normalizedSymbol) return;
    start({ symbol: result.normalizedSymbol, settings });
  };

  const isRunning = status === "running";
  const showError = status === "error";
  const showResults = status === "success";
  const errorContent = getErrorContent(errorCode, errorMessage);

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="app-card p-6 sm:p-8"
        noValidate
      >
        <fieldset disabled={isRunning} className="space-y-6 disabled:opacity-60">
          <div>
            <label htmlFor="symbol" className="text-sm font-medium">
              Index symbol
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Supported indexes:{" "}
              <span className="font-mono text-foreground">
                {SUPPORTED_SYMBOLS.join(" · ")}
              </span>
              . More coming soon.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <input
                  id="symbol"
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. QQQ"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={8}
                  aria-describedby="symbol-helper"
                  aria-invalid={!!(errors.symbol || liveErrors.symbol)}
                  className={`h-11 w-full rounded-md border bg-background px-3.5 font-mono text-sm uppercase tracking-wide outline-none transition-shadow focus:ring-2 focus:ring-ring/30 ${
                    errors.symbol || liveErrors.symbol
                      ? "border-destructive/60"
                      : "border-input"
                  }`}
                />
              </div>
              <select
                value={
                  (SUPPORTED_SYMBOLS as readonly string[]).includes(symbol)
                    ? symbol
                    : ""
                }
                onChange={(e) => e.target.value && setSymbol(e.target.value)}
                aria-label="Quick select supported index symbol"
                className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30 sm:w-44"
              >
                <option value="">Quick pick…</option>
                {SUPPORTED_SYMBOLS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {(errors.symbol || liveErrors.symbol) && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.symbol || liveErrors.symbol}
              </p>
            )}
            <p id="symbol-helper" className="mt-2 text-xs text-muted-foreground">
              US: QQQ, SPY, DIA. India: NIFTY, SENSEX. Indian indices report market cap
              in INR — adjust the market-cap floor accordingly (₹1B ≠ $1B).
            </p>
          </div>

          <AdvancedSettingsAccordion
            settings={settings}
            onChange={(next) => {
              setSettings(next);
              if (submitted) setErrors(validateRequest(symbol, next).errors);
            }}
            errors={liveErrors}
            disabled={isRunning}
          />

          <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-xs text-muted-foreground sm:max-w-md">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Analysis takes ~5 seconds in this demo. Partial data is flagged in the report rather than causing a hard failure.
            </p>
            <button
              type="submit"
              disabled={isRunning}
              aria-label={isRunning ? "Analysis running" : "Run index analysis"}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 disabled:cursor-not-allowed"
            >
              <Play className="h-4 w-4" />
              {isRunning ? "Running…" : showResults ? "Run again" : "Run Analysis"}
            </button>
          </div>
        </fieldset>
      </form>

      {(isRunning || showResults) && (
        <ProgressPanel
          symbol={symbol}
          steps={steps}
          status={status}
          onCancel={cancel}
        />
      )}

      {showError && (
        <ErrorState
          title={errorContent.title}
          description={errorContent.description}
          details={errorContent.details}
          action={
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface-elevated px-4 text-sm font-medium hover:bg-muted"
            >
              Reset
            </button>
          }
        />
      )}
    </div>
  );
}

function getErrorContent(errorCode: string | null, fallbackMessage: string | null) {
  switch (errorCode) {
    case "UNSUPPORTED_SYMBOL":
      return {
        title: "Symbol not supported yet",
        description:
          fallbackMessage ??
          "This demo currently supports QQQ, SPY, DIA, NIFTY, and SENSEX only.",
        details: ["Try one of the supported ETF symbols.", "Use Quick pick to avoid formatting mistakes."],
      };
    case "NO_CONSTITUENTS":
      return {
        title: "No constituents were available",
        description: fallbackMessage ?? "We could not build an investable universe for this run.",
        details: ["Try a different supported symbol.", "Re-run in a moment in case the provider snapshot was incomplete."],
      };
    case "PROVIDER_FAILURE":
      return {
        title: "Data provider problem",
        description: fallbackMessage ?? "One of the data sources did not respond cleanly.",
        details: ["Your settings were preserved.", "Re-running usually resolves transient provider issues."],
      };
    default:
      return {
        title: "Analysis failed",
        description: fallbackMessage ?? "Please try again.",
        details: ["Check the symbol and settings.", "If the problem persists, try a simpler configuration."],
      };
  }
}
