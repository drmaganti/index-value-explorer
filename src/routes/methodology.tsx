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
    body: "We define blue-chip as large, established, financially durable companies — typically with a market cap above a configurable floor (default $50B), a multi-year track record of revenue and earnings, and meaningful liquidity. The goal is to exclude speculative or fragile names from the start.",
  },
  {
    icon: TrendingDown,
    title: "What “pullback” means",
    body: "A pullback is a meaningful drawdown from a recent 52-week high — by default at least −15% — within a defined lookback window (default 6 months). The intent is to surface names that have come off recent peaks without necessarily breaking trend or fundamentals.",
  },
  {
    icon: Scale,
    title: "Why quality and value are blended",
    body: "Cheap alone is not enough — many low-multiple stocks are cheap for good reason. By blending value (multiples, free cash flow yield) with quality (margins, returns on capital, balance sheet strength), the screen biases toward names where the discount is more likely to reflect short-term sentiment than structural decline.",
  },
  {
    icon: AlertTriangle,
    title: "This is a screening tool, not financial advice",
    body: "Index Value Agent surfaces candidates for further research. It does not account for your goals, time horizon, taxes, or risk tolerance. Always do your own due diligence and consult a qualified advisor before making any investment decision.",
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
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="space-y-6">
          {sections.map((s) => (
            <article
              key={s.title}
              className="rounded-xl border border-border bg-surface-elevated p-6 shadow-soft"
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
          <p className="text-sm font-medium">Ready to try it?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Run the screen on QQQ, SPY, or DIA in under a minute.
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
