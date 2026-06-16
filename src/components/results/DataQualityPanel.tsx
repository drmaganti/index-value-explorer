import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { AnalysisReport } from "@/lib/analysis/types";

interface Props {
  report: AnalysisReport;
}

export function DataQualityPanel({ report }: Props) {
  const pct = report.summary.dataCompletenessPct;
  const low = pct < 70;
  const tone = low
    ? "border-destructive/40 bg-destructive/5 text-destructive"
    : "border-border bg-surface text-muted-foreground";

  return (
    <section className="app-card p-6">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${low ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}>
          {low ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold tracking-tight">Data quality</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.summary.metricsAvailable} of {report.summary.constituentsScanned} constituents returned usable metrics ({pct}% completeness).
            {report.summary.partialDataCount > 0
              ? ` ${report.summary.partialDataCount} ranked name${report.summary.partialDataCount === 1 ? "" : "s"} include partial data.`
              : " All ranked names have full metric coverage."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Primary provider: Finnhub. Fallback: Yahoo Finance. When a field is missing from the primary, the secondary fills it; if both are missing, the field is excluded from scoring rather than guessed.
          </p>
          {low ? (
            <div className={`mt-3 rounded-md border px-3 py-2 text-xs ${tone}`}>
              Data completeness is below 70%. Rankings reflect only the metrics that returned successfully — interpret with caution.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}