import { createFileRoute } from "@tanstack/react-router";
import { HeroSection } from "../components/sections/HeroSection";
import { FeatureStrip } from "../components/sections/FeatureStrip";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Index Value Agent — Blue-chip value inside major indexes" },
      {
        name: "description",
        content:
          "Analyze QQQ, SPY, or DIA and surface blue-chip stocks on recent pullback. A focused screening tool for long-horizon investors.",
      },
      { property: "og:title", content: "Index Value Agent" },
      {
        property: "og:description",
        content:
          "Find blue-chip value opportunities hiding inside major indexes — quality + value screening for long-horizon investors.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <HeroSection />
      <FeatureStrip />
      <section className="page-container pb-20">
        <div className="grid gap-6 rounded-xl border border-border bg-surface-elevated p-8 shadow-soft sm:p-12 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              How it works
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl text-balance">
              A cleaner way to review pullbacks inside major indexes.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base text-pretty">
              The workflow starts with a defined index universe, screens for durable large caps, checks the pullback range, then ranks survivors on valuation and quality factors.
            </p>
          </div>
          <ol className="space-y-4 text-sm">
            {[
              "Pick an index (QQQ, SPY, DIA).",
              "Filter to liquid, large-cap blue-chips.",
              "Detect candidates on recent pullback.",
              "Rank by blended quality + value score.",
            ].map((step, i) => (
              <li key={step} className="flex gap-3 rounded-lg border border-border bg-surface p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
