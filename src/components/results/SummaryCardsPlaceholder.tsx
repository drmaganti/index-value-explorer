import type { AnalysisReport } from "@/lib/analysis/types";

interface Props {
  report: AnalysisReport;
}

export function SummaryCardsPlaceholder({ report }: Props) {
  const { request, summary } = report;
  const bestOverall = report.ranked[0];
  const averagePullback = report.ranked.length
    ? report.ranked.reduce((total, stock) => total + Math.abs(stock.pullbackPct), 0) /
      report.ranked.length
    : 0;
  const strongestQuality = [...report.ranked].sort(
    (a, b) => (b.operatingMarginPct ?? 0) - (a.operatingMarginPct ?? 0),
  )[0];
  const cheapestValuation = [...report.ranked].sort(
    (a, b) => (a.forwardPE ?? Number.POSITIVE_INFINITY) - (b.forwardPE ?? Number.POSITIVE_INFINITY),
  )[0];
  const highestMargin = [...report.ranked].sort(
    (a, b) => (b.operatingMarginPct ?? 0) - (a.operatingMarginPct ?? 0),
  )[0];
  const cards = [
    {
      label: "Best overall candidate",
      value: bestOverall?.ticker ?? "—",
      sub: bestOverall ? `${bestOverall.name} · score ${bestOverall.score}` : "No ranked candidates",
    },
    {
      label: "Average winner pullback",
      value: `${averagePullback.toFixed(1)}%`,
      sub: `${summary.topCount} ranked names · ${request.settings.mode} mode`,
    },
    {
      label: "Strongest quality score",
      value: strongestQuality?.ticker ?? "—",
      sub: strongestQuality
        ? `${(strongestQuality.operatingMarginPct ?? 0).toFixed(0)}% operating margin`
        : "No qualified candidate",
    },
    {
      label: "Cheapest valuation",
      value: cheapestValuation?.ticker ?? "—",
      sub: cheapestValuation?.forwardPE != null
        ? `${cheapestValuation.forwardPE.toFixed(1)}x forward P/E`
        : "Forward P/E unavailable",
    },
    {
      label: "Highest margin candidate",
      value: highestMargin?.ticker ?? "—",
      sub: highestMargin?.operatingMarginPct != null
        ? `${highestMargin.operatingMarginPct.toFixed(0)}% operating margin`
        : "Margin data unavailable",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className="min-h-[128px] rounded-xl border border-border bg-surface-elevated p-5 shadow-soft"
        >
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight">{c.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
