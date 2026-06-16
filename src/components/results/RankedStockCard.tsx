import { useState } from "react";
import { ChevronDown, AlertCircle, ArrowDownRight } from "lucide-react";
import type { RankedCandidate } from "@/lib/analysis/types";

interface Props {
  stock: RankedCandidate;
}

export function RankedStockCard({ stock }: Props) {
  const [open, setOpen] = useState(false);

  const completenessLabel =
    stock.missingDataCount === 0
      ? "Complete data"
      : stock.missingDataCount <= 3
        ? "Mostly complete"
        : "Partial data";
  const completenessTone =
    stock.missingDataCount === 0
      ? "bg-primary/10 text-primary"
      : stock.missingDataCount <= 3
        ? "bg-accent text-accent-foreground"
        : "bg-muted text-muted-foreground";

  const factors = (stock.factorBreakdown ?? []).filter((f) => f.weight > 0);
  const strongest = [...factors].sort((a, b) => b.contribution - a.contribution).slice(0, 3);
  const weakest = [...factors]
    .filter((f) => f.rawValue != null)
    .sort((a, b) => a.normalized - b.normalized)
    .slice(0, 3);

  return (
    <article className="app-card overflow-hidden">
      <div className="border-b border-border/60 bg-surface px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              #{stock.rank.toString().padStart(2, "0")} · {stock.sector || "Sector n/a"}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="font-mono text-xl font-semibold tracking-tight">{stock.ticker}</span>
              <span className="truncate text-sm text-muted-foreground">{stock.name}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 font-mono text-sm font-semibold text-primary">
              {stock.score}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${completenessTone}`}>
              {stock.missingDataCount > 0 ? <AlertCircle className="h-3 w-3" /> : null}
              {completenessLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-3 lg:grid-cols-4">
        <Metric label="Price" value={fmtPrice(stock.currentPrice)} />
        <Metric label="Market cap" value={fmtBillions(stock.marketCapB)} />
        <Metric
          label="Pullback"
          value={
            <span className="inline-flex items-center gap-0.5 text-destructive">
              <ArrowDownRight className="h-3.5 w-3.5" />
              {stock.pullbackPct.toFixed(1)}%
            </span>
          }
        />
        <Metric label="Rev growth" value={fmtPct(stock.revenueGrowthPct)} />
        <Metric label="Op margin" value={fmtPct(stock.operatingMarginPct)} />
        <Metric label="FCF" value={fmtBillions(stock.freeCashFlowB)} />
        <Metric label="Debt / equity" value={fmtRatio(stock.debtToEquity)} />
        <Metric label="Fwd P/E" value={fmtMult(stock.forwardPE)} />
        <Metric label="Beta" value={fmtRatio(stock.beta)} />
        <Metric label="Above 200-DMA" value={stock.above200dma == null ? "—" : stock.above200dma ? "Yes" : "No"} />
      </div>

      <div className="border-t border-border/60 bg-surface px-5 py-4">
        {stock.passReasons[0] ? (
          <p className="text-sm leading-relaxed text-foreground">{stock.passReasons[0]}</p>
        ) : null}
        {stock.passReasons.length > 1 ? (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {stock.passReasons.slice(1, 4).map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          Why this score?
        </button>

        {open ? (
          <div className="mt-3 grid gap-4 rounded-md border border-border bg-surface-elevated p-4 md:grid-cols-2">
            <FactorList title="Strongest contributors" items={strongest} accent="positive" />
            <FactorList title="Weakest factors" items={weakest} accent="negative" />
            {stock.missingDataCount > 0 ? (
              <p className="md:col-span-2 text-[11px] text-muted-foreground">
                {stock.missingDataCount} metric{stock.missingDataCount === 1 ? "" : "s"} unavailable for this name. Score is computed from the metrics that were present; missing weights are redistributed across available factors.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-medium">{value}</p>
    </div>
  );
}

function FactorList({
  title,
  items,
  accent,
}: {
  title: string;
  items: { factor: string; label: string; rawValue?: number; normalized: number; weight: number; contribution: number }[];
  accent: "positive" | "negative";
}) {
  if (items.length === 0) {
    return (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="mt-2 text-xs text-muted-foreground">No data.</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((f) => {
          const pct = Math.round(f.normalized * 100);
          const barColor = accent === "positive" ? "bg-primary" : "bg-destructive/70";
          return (
            <li key={f.factor}>
              <div className="flex items-center justify-between text-xs">
                <span>{f.label}</span>
                <span className="font-mono text-muted-foreground">
                  {f.rawValue == null ? "n/a" : Number(f.rawValue.toFixed(2))}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Normalized {pct}/100 · weight {(f.weight * 100).toFixed(0)}%
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function fmtPrice(v?: number) { return v == null ? "—" : `$${v.toFixed(v >= 100 ? 0 : 2)}`; }
function fmtBillions(v?: number) { return v == null ? "—" : `$${v.toFixed(1)}B`; }
function fmtPct(v?: number) { return v == null ? "—" : `${v.toFixed(1)}%`; }
function fmtMult(v?: number) { return v == null ? "—" : `${v.toFixed(1)}x`; }
function fmtRatio(v?: number) { return v == null ? "—" : v.toFixed(2); }