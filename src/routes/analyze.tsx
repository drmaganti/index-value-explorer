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
        description="Choose a supported ETF, adjust the screening rules if needed, and generate a ranked shortlist for review."
      />
      <div className="page-container-narrow py-10">
        <InputPanel />
      </div>
    </>
  );
}
