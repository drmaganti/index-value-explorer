import { Building2, TrendingDown, BarChart3, ListOrdered } from "lucide-react";

const features = [
  {
    icon: Building2,
    title: "Large cap only",
    desc: "Filters down to liquid, established blue-chip names.",
  },
  {
    icon: TrendingDown,
    title: "Pullback detection",
    desc: "Identifies recent drawdowns from 52-week highs.",
  },
  {
    icon: BarChart3,
    title: "Fundamentals check",
    desc: "Margins, earnings stability, and balance-sheet quality.",
  },
  {
    icon: ListOrdered,
    title: "Ranked top 10",
    desc: "A clean, high-signal report tuned for long-horizon investors.",
  },
];

export function FeatureStrip() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
      <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="bg-surface-elevated p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <f.icon className="h-5 w-5" strokeWidth={2} />
            </div>
            <h3 className="mt-4 text-sm font-semibold tracking-tight">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
