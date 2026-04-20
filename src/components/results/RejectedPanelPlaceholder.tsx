import { useState } from "react";
import { ChevronDown, XCircle } from "lucide-react";
import type { RejectedCandidate } from "@/lib/analysis/types";

interface Props {
  rows: RejectedCandidate[];
}

export function RejectedPanelPlaceholder({ rows }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-6 shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="rejected-candidates-panel"
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div>
          <p className="text-sm font-semibold">Rejected candidates</p>
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
        <ul id="rejected-candidates-panel" className="mt-4 divide-y divide-border">
          {rows.map((r) => (
            <li key={r.ticker} className="flex flex-col gap-2 py-3 text-sm md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-2.5">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-mono font-medium">{r.ticker} {r.name ? <span className="font-sans text-muted-foreground">· {r.name}</span> : null}</p>
                  {r.sector ? <p className="text-xs text-muted-foreground">{r.sector}</p> : null}
                </div>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground md:max-w-[55%]">
                {(r.reasons ?? [r.reason]).map((reason) => (
                  <p key={reason}>{reason}</p>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
