import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/common/PageHeader";
import { InputPanel } from "../components/analysis/InputPanel";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Analyze an Index — Index Value Agent" },
      {
        name: "description",
        content:
          "Run a quality + value screen on QQQ, SPY, or DIA. Configure pullback windows and market-cap filters.",
      },
      { property: "og:title", content: "Analyze an Index — Index Value Agent" },
      {
        property: "og:description",
        content: "Run a quality + value screen on a major US index ETF.",
      },
    ],
  }),
  component: AnalyzePage,
});

function AnalyzePage() {
  return (
    <>
      <PageHeader
        eyebrow="Analysis"
        title="Run an index analysis"
        description="Choose an index ETF and the agent will screen its constituents for blue-chip names trading at a discount after a recent pullback."
      />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <InputPanel />
      </div>
    </>
  );
}
