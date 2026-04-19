import { ArrowDownRight } from "lucide-react";

export interface RankedRow {
  rank: number;
  ticker: string;
  name: string;
  sector: string;
  pullback: string;
  score: number;
}

const sample: RankedRow[] = [
  { rank: 1, ticker: "ADBE", name: "Adobe Inc.", sector: "Software", pullback: "−21.4%", score: 92 },
  { rank: 2, ticker: "GOOGL", name: "Alphabet Inc.", sector: "Communication", pullback: "−16.8%", score: 89 },
  { rank: 3, ticker: "AMD", name: "Advanced Micro Devices", sector: "Semis", pullback: "−27.1%", score: 86 },
  { rank: 4, ticker: "PEP", name: "PepsiCo Inc.", sector: "Cons. Staples", pullback: "−18.2%", score: 84 },
  { rank: 5, ticker: "TXN", name: "Texas Instruments", sector: "Semis", pullback: "−15.6%", score: 83 },
  { rank: 6, ticker: "INTU", name: "Intuit Inc.", sector: "Software", pullback: "−19.0%", score: 81 },
  { rank: 7, ticker: "QCOM", name: "Qualcomm Inc.", sector: "Semis", pullback: "−22.5%", score: 79 },
  { rank: 8, ticker: "MDLZ", name: "Mondelez International", sector: "Cons. Staples", pullback: "−17.3%", score: 77 },
  { rank: 9, ticker: "BKNG", name: "Booking Holdings", sector: "Travel", pullback: "−15.9%", score: 76 },
  { rank: 10, ticker: "AMAT", name: "Applied Materials", sector: "Semis", pullback: "−24.1%", score: 74 },
];

interface Props {
  onSelect?: (row: RankedRow) => void;
  selectedTicker?: string;
}

export function RankedTablePlaceholder({ onSelect, selectedTicker }: Props) {
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
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pullback</th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Score</th>
            </tr>
          </thead>
          <tbody>
            {sample.map((row) => {
              const selected = row.ticker === selectedTicker;
              return (
                <tr
                  key={row.ticker}
                  onClick={() => onSelect?.(row)}
                  className={`cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/60 ${selected ? "bg-accent/40" : ""}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.rank.toString().padStart(2, "0")}</td>
                  <td className="px-4 py-3 font-mono font-semibold">{row.ticker}</td>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{row.sector}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 font-mono text-destructive">
                      <ArrowDownRight className="h-3.5 w-3.5" />
                      {row.pullback}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex min-w-[44px] justify-center rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary">
                      {row.score}
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

export const sampleRanked = sample;
