import { ShieldCheck, Filter, Scale, Sliders } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function MethodologySummary() {
  const items = [
    {
      icon: Filter,
      title: "Hard filters first",
      body: "Each constituent must clear every hard filter (market cap, pullback band, operating margin, FCF, leverage, 200-DMA). Anything that fails a filter is rejected with the specific reason — it is never scored.",
    },
    {
      icon: Scale,
      title: "Score 0–100, weights redistribute",
      body: "Surviving stocks are scored on valuation, quality, growth, balance sheet, volatility, and pullback factors. Each factor is normalized 0–1 and multiplied by its weight. If a metric is missing, that factor is dropped and its weight is redistributed across the available factors.",
    },
    {
      icon: Sliders,
      title: "Mode tilts the weights",
      body: "Conservative tilts toward margin, FCF, and balance-sheet quality. Balanced uses default weights. Opportunistic tilts toward pullback depth and growth. The same factors are used in every mode — only the weights differ.",
    },
    {
      icon: ShieldCheck,
      title: "AI only narrates results",
      body: "The optional AI summary describes the deterministic output in plain English. It never invents data, never recommends buy/sell/hold, and never sets price targets. The numeric score is always the source of truth.",
    },
  ];

  return (
    <section className="app-card p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight">Methodology</h3>
        <Link to="/methodology" className="text-xs font-medium text-primary hover:underline">
          Full methodology →
        </Link>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {items.map((it) => (
          <div key={it.title} className="rounded-md border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <it.icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold">{it.title}</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{it.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}