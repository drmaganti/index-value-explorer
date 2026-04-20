import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { AnalysisStep, AnalysisStatus } from "@/lib/analysis/types";

interface Props {
  symbol: string;
  steps: AnalysisStep[];
  status: AnalysisStatus;
  onCancel?: () => void;
}

export function ProgressPanel({ symbol, steps, status, onCancel }: Props) {
  const completed = steps.filter((s) => s.status === "done").length;
  const progress = Math.round((completed / steps.length) * 100);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-soft">
      <div className="flex items-start justify-between gap-3 px-6 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {status === "success" ? "Analysis complete" : "Analysis in progress"}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-mono text-xl font-semibold tracking-tight">{symbol}</p>
            <p className="font-mono text-xs text-muted-foreground">{progress}%</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {status === "success"
              ? "Report built and ready to review."
              : "Checking constituents, fundamentals, and ranking candidates step by step."}
          </p>
        </div>
        {status === "running" && (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 h-1 w-full overflow-hidden bg-border">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="space-y-1 px-6 py-5">
        {steps.map((step) => (
          <li
            key={step.id}
            className={`flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors ${
              step.status === "active" ? "bg-accent/40" : ""
            }`}
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
              {step.status === "done" && (
                <CheckCircle2 className="h-4.5 w-4.5 text-success" />
              )}
              {step.status === "active" && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              {step.status === "pending" && (
                <Circle className="h-4 w-4 text-muted-foreground/40" />
              )}
            </span>
            <div className="min-w-0">
              <p
                className={`text-sm ${
                  step.status === "pending"
                    ? "text-muted-foreground"
                    : step.status === "active"
                      ? "font-medium"
                      : "text-foreground"
                }`}
              >
                {step.label}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
