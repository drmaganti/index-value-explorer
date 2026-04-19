import { Loader2, CheckCircle2, Circle } from "lucide-react";

const steps = [
  { label: "Fetching index constituents", status: "done" as const },
  { label: "Filtering large-cap blue-chips", status: "done" as const },
  { label: "Detecting recent pullbacks", status: "active" as const },
  { label: "Evaluating fundamentals & quality", status: "pending" as const },
  { label: "Ranking top opportunities", status: "pending" as const },
];

export function ProgressPanelPlaceholder({ symbol }: { symbol: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Analysis in progress
          </p>
          <p className="mt-1 font-mono text-lg font-semibold">{symbol}</p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>

      <ol className="mt-6 space-y-3">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-3 text-sm">
            {s.status === "done" && <CheckCircle2 className="h-4 w-4 text-success" />}
            {s.status === "active" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            {s.status === "pending" && <Circle className="h-4 w-4 text-muted-foreground/40" />}
            <span
              className={
                s.status === "pending"
                  ? "text-muted-foreground"
                  : s.status === "active"
                    ? "font-medium"
                    : "text-foreground"
              }
            >
              {s.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
