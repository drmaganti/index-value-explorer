const cards = [
  { label: "Index analyzed", value: "QQQ", sub: "Nasdaq-100 ETF" },
  { label: "Constituents scanned", value: "100", sub: "Large-cap filter applied" },
  { label: "Candidates on pullback", value: "23", sub: "≥15% from 52-wk high" },
  { label: "Top opportunities", value: "10", sub: "Quality + value blend" },
];

export function SummaryCardsPlaceholder() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-border bg-surface-elevated p-5 shadow-soft"
        >
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight">{c.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
