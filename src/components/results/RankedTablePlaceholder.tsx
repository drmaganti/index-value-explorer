import { ArrowDownRight } from "lucide-react";
import type { RankedCandidate } from "@/lib/analysis/types";
import { EmptyState } from "@/components/common/EmptyState";

interface Props {
  rows: RankedCandidate[];
  onSelect?: (row: RankedCandidate) => void;
  selectedTicker?: string;
}

export function RankedTablePlaceholder({ rows, onSelect, selectedTicker }: Props) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No candidates matched your filters"
        description="Try widening the pullback range or lowering the market-cap floor."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">#</th>
              <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Ticker</th>
              <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Company</th>
              <th className="hidden px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:table-cell">Sector</th>
              <th className="hidden px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground lg:table-cell">Mkt cap</th>
              <th className="hidden px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground lg:table-cell">Price</th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pullback</th>
              <th className="hidden px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground xl:table-cell">Fwd P/E</th>
              <th className="hidden px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground xl:table-cell">Rev growth</th>
              <th className="hidden px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground xl:table-cell">Op margin</th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Value</th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Quality</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = row.ticker === selectedTicker;
              return (
                <tr
                  key={row.ticker}
                  onClick={() => onSelect?.(row)}
                  className={`cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/60 ${selected ? "bg-accent/40" : ""}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {row.rank.toString().padStart(2, "0")}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold">{row.ticker}</td>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {row.sector}
                  </td>
                  <td className="hidden px-4 py-3 text-right font-mono text-xs lg:table-cell">
                    {formatCurrencyCompact(row.marketCapB, "B")}
                  </td>
                  <td className="hidden px-4 py-3 text-right font-mono text-xs lg:table-cell">
                    {formatPrice(row.currentPrice)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 font-mono text-destructive">
                      <ArrowDownRight className="h-3.5 w-3.5" />
                      {row.pullbackPct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-right font-mono text-xs xl:table-cell">
                    {formatMultiple(row.forwardPE)}
                  </td>
                  <td className="hidden px-4 py-3 text-right font-mono text-xs xl:table-cell">
                    {formatPercent(row.revenueGrowthPct)}
                  </td>
                  <td className="hidden px-4 py-3 text-right font-mono text-xs xl:table-cell">
                    {formatPercent(row.operatingMarginPct)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex min-w-[44px] justify-center rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary">
                      {row.score}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex min-w-[44px] justify-center rounded-md px-2 py-0.5 font-mono text-xs font-medium ${qualityTone(row.operatingMarginPct)}`}>
                      {qualityLabel(row.operatingMarginPct)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCurrencyCompact(value?: number, suffix = ""): string {
  return value == null ? "—" : `$${value.toFixed(0)}${suffix}`;
}

function formatPrice(value?: number): string {
  return value == null ? "—" : `$${value.toFixed(value >= 100 ? 0 : 2)}`;
}

function formatMultiple(value?: number): string {
  return value == null ? "—" : `${value.toFixed(1)}x`;
}

function formatPercent(value?: number): string {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}

function qualityLabel(margin?: number): string {
  if (margin == null) return "—";
  if (margin >= 30) return "A";
  if (margin >= 20) return "B";
  if (margin >= 10) return "C";
  return "D";
}

function qualityTone(margin?: number): string {
  if (margin == null) return "bg-muted text-muted-foreground";
  if (margin >= 30) return "bg-primary/10 text-primary";
  if (margin >= 20) return "bg-accent text-accent-foreground";
  return "bg-muted text-muted-foreground";
}
