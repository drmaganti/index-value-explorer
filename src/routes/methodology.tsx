import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "../components/common/PageHeader";
import { ShieldCheck, TrendingDown, Scale, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology — Index Value Agent" },
      {
        name: "description",
        content:
          "How the Index Value Agent defines blue-chip, detects pullbacks, and blends quality with value. A screening tool, not financial advice.",
      },
      { property: "og:title", content: "Methodology — Index Value Agent" },
      {
        property: "og:description",
        content:
          "How blue-chip, pullback, and the quality + value blend are defined inside the Index Value Agent.",
      },
    ],
  }),
  component: MethodologyPage,
});

const sections = [
  {
    icon: ShieldCheck,
    title: "What “blue-chip” means here",
    body: "Here it means large, established businesses with durable economics, meaningful liquidity, and enough fundamental history to screen with confidence. The goal is to exclude fragile or speculative names before ranking begins.",
  },
  {
    icon: TrendingDown,
    title: "What “pullback” means",
    body: "A pullback is a meaningful move below a recent 52-week high. The screen looks for names that have reset without automatically assuming the underlying business has weakened.",
  },
  {
    icon: Scale,
    title: "Why quality and value are blended",
    body: "Cheap alone is not enough. The ranking blends valuation with operating quality so the shortlist favors discounts that may reflect sentiment or timing rather than lasting business deterioration.",
  },
  {
    icon: AlertTriangle,
    title: "This is a screening tool, not financial advice",
    body: "Index Value Agent surfaces candidates for further review. It does not know your objectives, constraints, taxes, or risk tolerance, so every result should be treated as research input rather than a recommendation.",
  },
];

function MethodologyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Methodology"
        title="How the agent thinks"
        description="A plain-English explanation of how candidates are defined, filtered, and ranked."
      />
      <div className="page-container-narrow py-12">
        <div className="space-y-6">
          {sections.map((s) => (
            <article
              key={s.title}
              className="app-card p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">{s.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                    {s.body}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-dashed border-border bg-surface p-6 text-center">
          <p className="text-sm font-medium">Ready to run the screen?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Start with QQQ, SPY, or DIA and review the ranked output in a few seconds.
          </p>
          <Link
            to="/analyze"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Analyze an Index
          </Link>
        </div>
      </div>
    </>
  );
}
