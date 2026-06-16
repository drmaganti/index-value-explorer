import { useState } from "react";
import { ChevronDown, XCircle } from "lucide-react";
import type { RejectedCandidate } from "@/lib/analysis/types";

interface Props {
  rows: RejectedCandidate[];
}

export function RejectedPanelPlaceholder({ rows }: Props) {
  const [open, setOpen] = useState(false);

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="app-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="rejected-candidates-panel"
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left hover:bg-surface"
      >
        <div>
          <p className="text-sm font-semibold">Rejected stocks</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Names excluded by hard filters, with explicit rejection reasons.
          </p>
        </div>
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs text-muted-foreground">
            {rows.length}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open ? (
        <div id="rejected-candidates-panel" className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left">
                <th className="px-5 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Ticker</th>
                <th className="px-5 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Company</th>
                <th className="px-5 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Primary reason</th>
                <th className="px-5 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">All reasons</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const all = r.reasons ?? [r.reason];
                return (
                  <tr key={r.ticker} className="border-b border-border/60 last:border-0 align-top">
                    <td className="px-5 py-3 font-mono text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        {r.ticker}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p>{r.name ?? "—"}</p>
                      {r.sector ? <p className="text-[11px] text-muted-foreground">{r.sector}</p> : null}
                    </td>
                    <td className="px-5 py-3 text-xs">{r.reason}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {all.length > 1 ? (
                        <ul className="space-y-0.5">
                          {all.slice(1).map((reason) => (
                            <li key={reason}>• {reason}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground/70">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
