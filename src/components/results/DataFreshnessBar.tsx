import { Calendar, CheckCircle2, AlertTriangle, XCircle, Database } from "lucide-react";
import type { AnalysisReport } from "@/lib/analysis/types";

interface Props {
  report: AnalysisReport;
}

const TONE: Record<string, { badge: string; icon: typeof CheckCircle2; label: string }> = {
  fresh: {
    badge: "bg-primary/10 text-primary border-primary/20",
    icon: CheckCircle2,
    label: "Fresh",
  },
  stale: {
    badge: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
    icon: AlertTriangle,
    label: "Stale",
  },
  missing: {
    badge: "bg-destructive/10 text-destructive border-destructive/30",
    icon: XCircle,
    label: "Missing",
  },
};

export function DataFreshnessBar({ report }: Props) {
  const freshness = report.freshness ?? "missing";
  const tone = TONE[freshness];
  const Icon = tone.icon;

  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Market data as of</span>
            <span className="font-mono font-medium">
              {report.marketDataAsOf ?? "—"}
            </span>
            <span className="text-xs text-muted-foreground">close</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Index constituents refreshed</span>
            <span className="font-mono font-medium">
              {report.constituentsAsOf ?? "—"}
            </span>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${tone.badge}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {tone.label}
        </span>
      </div>
      {report.freshnessNote ? (
        <div className="border-t border-border/60 bg-surface px-5 py-3 text-xs text-muted-foreground">
          {report.freshnessNote} This is an end-of-day research snapshot, not intraday trading data.
        </div>
      ) : (
        <div className="border-t border-border/60 bg-surface px-5 py-3 text-xs text-muted-foreground">
          Based on the latest completed market close. Long-term research screener — not intraday trading data.
        </div>
      )}
    </section>
  );
}