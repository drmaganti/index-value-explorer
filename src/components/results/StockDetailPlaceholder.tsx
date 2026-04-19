import type { RankedRow } from "./RankedTablePlaceholder";

interface Props {
  stock?: RankedRow;
}

export function StockDetailPlaceholder({ stock }: Props) {
  if (!stock) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface p-8 text-center">
        <p className="text-sm font-medium">Select a stock</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Click any row in the ranked table to see fundamentals & rationale.
        </p>
      </div>
    );
  }

  const metrics = [
    { label: "P/E (fwd)", value: "21.4" },
    { label: "Op. margin", value: "33%" },
    { label: "Rev. growth (3y)", value: "+12%" },
    { label: "Net cash", value: "$8.2B" },
    { label: "From 52-wk high", value: stock.pullback },
    { label: "Quality score", value: "A−" },
  ];

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">#{stock.rank.toString().padStart(2, "0")} · {stock.sector}</p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">{stock.ticker}</p>
          <p className="text-sm text-muted-foreground">{stock.name}</p>
        </div>
        <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 font-mono text-xs font-medium text-primary">
          Score {stock.score}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-md border border-border bg-surface px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
            <p className="mt-0.5 font-mono text-sm font-medium">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-md border border-border bg-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Why it ranks
        </p>
        <p className="mt-2 text-sm leading-relaxed text-pretty">
          High operating margins, durable cash generation, and a meaningful pullback from
          recent highs without deterioration in core fundamentals — fits the long-horizon
          quality + value lens.
        </p>
      </div>
    </div>
  );
}
