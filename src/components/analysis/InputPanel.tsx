import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Play, Info } from "lucide-react";
import { AdvancedSettingsAccordion } from "./AdvancedSettingsAccordion";
import { ProgressPanelPlaceholder } from "./ProgressPanelPlaceholder";

const PRESETS = ["QQQ", "SPY", "DIA"] as const;

export function InputPanel() {
  const [symbol, setSymbol] = useState<string>("QQQ");
  const [running, setRunning] = useState(false);

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    // Placeholder: wire up real analysis later.
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface-elevated p-6 shadow-soft sm:p-8">
        <form onSubmit={handleRun} className="space-y-6">
          <div>
            <label htmlFor="symbol" className="text-sm font-medium">
              Index symbol
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter or pick a major US index ETF. The agent will pull its constituents.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                id="symbol"
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. QQQ"
                className="h-11 flex-1 rounded-md border border-input bg-background px-3.5 text-sm font-mono uppercase tracking-wide outline-none transition-shadow placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring/30"
              />
              <select
                value={PRESETS.includes(symbol as (typeof PRESETS)[number]) ? symbol : ""}
                onChange={(e) => e.target.value && setSymbol(e.target.value)}
                className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30 sm:w-44"
              >
                <option value="">Quick pick…</option>
                {PRESETS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <AdvancedSettingsAccordion />

          <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-xs text-muted-foreground sm:max-w-md">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Analysis typically takes 30–90 seconds depending on the index size.
            </p>
            <button
              type="submit"
              disabled={!symbol || running}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-4 w-4" />
              {running ? "Running…" : "Run Analysis"}
            </button>
          </div>
        </form>
      </div>

      {running && <ProgressPanelPlaceholder symbol={symbol} />}

      <div className="flex items-center justify-center text-xs text-muted-foreground">
        Want to see what a finished report looks like?{" "}
        <Link to="/results" className="ml-1 font-medium text-primary hover:underline">
          View sample
        </Link>
      </div>
    </div>
  );
}
