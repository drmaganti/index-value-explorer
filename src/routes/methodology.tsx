import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "../components/common/PageHeader";
import { ShieldCheck, TrendingDown, Scale, AlertTriangle, Filter, Sliders, Bot } from "lucide-react";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology — US Index Stock Screener" },
      {
        name: "description",
        content:
          "How the deterministic US index screener applies hard filters, scores survivors 0–100, and uses AI only to narrate results. A research tool, not financial advice.",
      },
      { property: "og:title", content: "Methodology — US Index Stock Screener" },
      {
        property: "og:description",
        content:
          "Hard filters, factor scoring 0–100, mode tilts, and how the AI summary is constrained to narrate the deterministic output.",
      },
    ],
  }),
  component: MethodologyPage,
});

const sections = [
  {
    icon: Filter,
    title: "1. Hard filters run first",
    body: "Every constituent must clear every hard filter — market-cap floor, pullback band, minimum operating margin, free-cash-flow policy, leverage cap, and the 200-day moving average rule. Anything that fails is rejected with a specific machine-readable reason and is never scored.",
  },
  {
    icon: Scale,
    title: "2. Survivors are scored 0–100",
    body: "Passing stocks are scored across valuation (forward P/E, trailing P/E, EV/EBITDA, P/B), quality (operating margin, gross margin, ROE), growth (revenue, earnings), balance sheet (debt/equity, free cash flow), volatility (beta), and pullback depth. Each factor is normalized 0–1 against fixed bounds, multiplied by its weight, and summed. The total is rescaled to 0–100.",
  },
  {
    icon: Sliders,
    title: "3. Missing metrics redistribute weight",
    body: "If a stock is missing a factor's value, that factor is dropped and its weight is redistributed proportionally across the factors that do have data. Stocks with sparse coverage aren't penalized to zero, but the card flags partial data so you can interpret the score with the right confidence.",
  },
  {
    icon: ShieldCheck,
    title: "4. Mode tilts the weights",
    body: "Conservative tilts toward operating margin, free cash flow, and balance-sheet strength. Balanced uses the default weights. Opportunistic tilts toward pullback depth and growth. The same factors are used in every mode — only the weights change.",
  },
  {
    icon: TrendingDown,
    title: "5. Pullback is just distance from a 52-week high",
    body: "A pullback is a negative percentage off the trailing 52-week high. A stock priced 18% below its high has an −18% pullback. The screen lets you set the band you want to consider (for example 8% to 35%) so you can ignore stocks that haven't moved or those in deep distress.",
  },
  {
    icon: Bot,
    title: "6. AI only narrates the output",
    body: "If credits are available, an AI summary describes what the deterministic output shows: themes, sector skew, common factors, and cautions. The model is explicitly forbidden from inventing data, recommending buy/sell/hold, or setting price targets. The score table is always the source of truth.",
  },
  {
    icon: AlertTriangle,
    title: "This is a research tool, not financial advice",
    body: "The screener surfaces candidates for further review. It does not know your objectives, constraints, taxes, or risk tolerance, so every result should be treated as research input — never as a recommendation to buy or sell.",
  },
];

function MethodologyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Methodology"
        title="How the screener works"
        description="A plain-English walkthrough of how candidates are filtered, scored, and explained. The deterministic engine is the source of truth; the AI layer only narrates."
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
