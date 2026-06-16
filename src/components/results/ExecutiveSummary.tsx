import { ShieldCheck, Layers, CheckCircle2, XCircle, ListOrdered, Activity } from "lucide-react";
import type { AnalysisReport } from "@/lib/analysis/types";

const MODE_LABEL: Record<string, string> = {
  conservative: "Conservative",
  balanced: "Balanced",
  opportunistic: "Opportunistic",
};

interface Props {
  report: AnalysisReport;
}

export function ExecutiveSummary({ report }: Props) {
  const { summary, request } = report;
  const stats = [
    { icon: Layers, label: "Constituents scanned", value: summary.constituentsScanned.toString() },
    { icon: CheckCircle2, label: "Passed filters", value: summary.passedCount.toString() },
    { icon: XCircle, label: "Rejected", value: summary.rejectedCount.toString() },
    { icon: ListOrdered, label: "Top N returned", value: summary.topCount.toString() },
    { icon: ShieldCheck, label: "Data completeness", value: `${summary.dataCompletenessPct}%` },
    { icon: Activity, label: "Scoring mode", value: MODE_LABEL[request.settings.mode] ?? request.settings.mode },
  ];

  const blurb =
    summary.passedCount === 0
      ? `No name in ${summary.universeName} cleared every hard filter in this run.`
      : `${summary.passedCount} of ${summary.constituentsScanned} ${summary.universeName} constituents passed the hard filters. The top ${summary.topCount} are ranked below using the ${MODE_LABEL[request.settings.mode] ?? request.settings.mode} weighting profile.`;

  return (
    <section className="app-card overflow-hidden">
      <div className="border-b border-border/60 bg-surface px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Executive summary</p>
        <p className="mt-2 text-sm leading-relaxed">{blurb}</p>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface-elevated px-4 py-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <s.icon className="h-3 w-3" />
              {s.label}
            </div>
            <p className="mt-1.5 font-mono text-xl font-semibold tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}