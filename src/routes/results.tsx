import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, BookOpen, Sparkles } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";
import { SummaryCardsPlaceholder } from "../components/results/SummaryCardsPlaceholder";
import { RankedTablePlaceholder } from "../components/results/RankedTablePlaceholder";
import { StockDetailPlaceholder } from "../components/results/StockDetailPlaceholder";
import { RejectedPanelPlaceholder } from "../components/results/RejectedPanelPlaceholder";
import { getLastReport } from "../lib/analysis/reportStore";
import { runMockAnalysis } from "../lib/analysis/mockRunner";
import { DEFAULT_SETTINGS } from "../lib/analysis/defaults";
import type { AnalysisReport, RankedCandidate } from "../lib/analysis/types";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Report — Index Value Agent" },
      {
        name: "description",
        content:
          "Ranked top blue-chip value opportunities surfaced by the Index Value Agent screen.",
      },
      { property: "og:title", content: "Report — Index Value Agent" },
      {
        property: "og:description",
        content: "Ranked top blue-chip value opportunities from the Index Value Agent.",
      },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const [report, setReport] = useState<AnalysisReport | null>(() => getLastReport());

  // If user navigates here directly with no run, build a sample so the page
  // is never empty for first-time visitors.
  useEffect(() => {
    if (report) return;
    const handle = runMockAnalysis(
      { symbol: "QQQ", settings: DEFAULT_SETTINGS },
      {
        onStep: () => {},
        onComplete: setReport,
        onError: () => {},
      },
    );
    return () => handle.cancel();
  }, [report]);

  const [selected, setSelected] = useState<RankedCandidate | undefined>();

  const firstRanked = report?.ranked[0];
  useEffect(() => {
    if (firstRanked && !selected) setSelected(firstRanked);
  }, [firstRanked, selected]);

  const isSample = useMemo(
    () => !!report && !getLastReport(),
    [report],
  );

  if (!report) {
    return (
      <>
        <PageHeader eyebrow="Report" title="Loading sample report…" />
        <div className="mx-auto max-w-7xl px-6 py-10">
          <EmptyState title="Preparing a sample report" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={`${isSample ? "Sample report · " : "Report · "}${report.request.symbol}`}
        title={`Top ${report.summary.topCount} blue-chip value opportunities`}
        description={`Generated ${new Date(report.generatedAt).toLocaleString()} · ${report.request.settings.mode} mode`}
        actions={
          <>
            <Link
              to="/methodology"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface-elevated px-3 text-sm font-medium hover:bg-muted"
            >
              <BookOpen className="h-4 w-4" />
              Methodology
            </Link>
            <Link
              to="/analyze"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface-elevated px-3 text-sm font-medium hover:bg-muted"
            >
              <Sparkles className="h-4 w-4" />
              New run
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
        <SummaryCardsPlaceholder report={report} />

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">Ranked candidates</h2>
              <p className="text-xs text-muted-foreground">Click a row to inspect</p>
            </div>
            <RankedTablePlaceholder
              rows={report.ranked}
              onSelect={setSelected}
              selectedTicker={selected?.ticker}
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight">Stock detail</h2>
            <StockDetailPlaceholder stock={selected} />
          </div>
        </div>

        <RejectedPanelPlaceholder rows={report.rejected} />

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
