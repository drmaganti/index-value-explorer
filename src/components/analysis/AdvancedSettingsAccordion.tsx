import { useState } from "react";
import { ChevronDown, Settings2 } from "lucide-react";

export function AdvancedSettingsAccordion() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          Advanced settings
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            optional
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="grid gap-4 border-t border-border px-4 py-4 sm:grid-cols-2">
          <Setting label="Min market cap" value="$50B" hint="Large-cap floor" />
          <Setting label="Pullback window" value="6 months" hint="Lookback for drawdown" />
          <Setting label="Min pullback" value="−15%" hint="From 52-week high" />
          <Setting label="Investment horizon" value="2+ years" hint="Sets ranking weights" />
          <p className="text-xs text-muted-foreground sm:col-span-2">
            These controls are placeholders for now. Full configuration is coming soon.
          </p>
        </div>
      )}
    </div>
  );
}

function Setting({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-elevated px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-medium">{value}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
