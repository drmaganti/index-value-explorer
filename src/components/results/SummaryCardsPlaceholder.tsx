import type { AnalysisReport } from "@/lib/analysis/types";

interface Props {
  report: AnalysisReport;
}

export function SummaryCardsPlaceholder({ report }: Props) {
  const { request, summary } = report;
  const cards = [
    { label: "Index analyzed", value: request.symbol, sub: indexLabel(request.symbol) },
    {
      label: "Constituents scanned",
      value: summary.constituentsScanned.toLocaleString(),
      sub: `Min cap $${request.settings.minMarketCapB}B`,
    },
    {
      label: "Candidates on pullback",
      value: summary.candidatesOnPullback.toString(),
      sub: `${request.settings.minPullbackPct}–${request.settings.maxPullbackPct}% range`,
    },
    {
      label: "Top opportunities",
      value: summary.topCount.toString(),
      sub: `${request.settings.mode} mode`,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-border bg-surface-elevated p-5 shadow-soft"
        >
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight">{c.value}</p>
          <p className="mt-1 text-xs capitalize text-muted-foreground">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

function indexLabel(symbol: string): string {
  switch (symbol) {
    case "QQQ":
      return "Nasdaq-100 ETF";
    case "SPY":
      return "S&P 500 ETF";
    case "DIA":
      return "Dow Jones 30 ETF";
    default:
      return "Index ETF";
  }
}
