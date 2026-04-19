import { XCircle } from "lucide-react";

const rejected = [
  { ticker: "TSLA", reason: "Valuation premium too high" },
  { ticker: "NFLX", reason: "Insufficient pullback" },
  { ticker: "MRNA", reason: "Earnings instability" },
  { ticker: "PYPL", reason: "Quality score below threshold" },
  { ticker: "WBD", reason: "Balance sheet leverage" },
];

export function RejectedPanelPlaceholder() {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Rejected candidates</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Notable names that passed initial filters but were screened out.
          </p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs text-muted-foreground">
          {rejected.length}
        </span>
      </div>
      <ul className="mt-4 divide-y divide-border">
        {rejected.map((r) => (
          <li key={r.ticker} className="flex items-center justify-between py-2.5 text-sm">
            <span className="flex items-center gap-2.5">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono font-medium">{r.ticker}</span>
            </span>
            <span className="text-xs text-muted-foreground">{r.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
