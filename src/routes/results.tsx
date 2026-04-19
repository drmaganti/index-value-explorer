import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, BookOpen } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { SummaryCardsPlaceholder } from "../components/results/SummaryCardsPlaceholder";
import {
  RankedTablePlaceholder,
  sampleRanked,
  type RankedRow,
} from "../components/results/RankedTablePlaceholder";
import { StockDetailPlaceholder } from "../components/results/StockDetailPlaceholder";
import { RejectedPanelPlaceholder } from "../components/results/RejectedPanelPlaceholder";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Sample Report — Index Value Agent" },
      {
        name: "description",
        content:
          "Example output from the Index Value Agent: ranked top 10 blue-chip value opportunities with rationale and rejected candidates.",
      },
      { property: "og:title", content: "Sample Report — Index Value Agent" },
      {
        property: "og:description",
        content: "Example ranked top 10 blue-chip value report from the Index Value Agent.",
      },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const [selected, setSelected] = useState<RankedRow | undefined>(sampleRanked[0]);

  return (
    <>
      <PageHeader
        eyebrow="Sample report · QQQ"
        title="Top 10 blue-chip value opportunities"
        description="A ranked screen of large-cap names on recent pullback that pass the quality + value blend."
        actions={
          <>
            <Link
              to="/methodology"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface-elevated px-3 text-sm font-medium hover:bg-muted"
            >
              <BookOpen className="h-4 w-4" />
              Methodology
            </Link>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </>
        }
      />

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        <SummaryCardsPlaceholder />

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">Ranked candidates</h2>
              <p className="text-xs text-muted-foreground">Click a row to inspect</p>
            </div>
            <RankedTablePlaceholder onSelect={setSelected} selectedTicker={selected?.ticker} />
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight">Stock detail</h2>
            <StockDetailPlaceholder stock={selected} />
          </div>
        </div>

        <RejectedPanelPlaceholder />

        <p className="text-center text-xs text-muted-foreground">
          This is a screening output, not financial advice. See{" "}
          <Link to="/methodology" className="font-medium text-primary hover:underline">
            methodology
          </Link>{" "}
          for details.
        </p>
      </div>
    </>
  );
}
