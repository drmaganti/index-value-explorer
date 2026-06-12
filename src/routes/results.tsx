import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, BookOpen, Sparkles, ShieldCheck } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";
import { SummaryCardsPlaceholder } from "../components/results/SummaryCardsPlaceholder";
import { RankedTablePlaceholder } from "../components/results/RankedTablePlaceholder";
import { StockDetailPlaceholder } from "../components/results/StockDetailPlaceholder";
import { RejectedPanelPlaceholder } from "../components/results/RejectedPanelPlaceholder";
import { getLastReport } from "../lib/analysis/reportStore";
import { runAnalysis } from "../lib/analysis/analysis.functions";
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
  const runAnalysisFn = useServerFn(runAnalysis);
  const [report, setReport] = useState<AnalysisReport | null>(() => getLastReport());

  useEffect(() => {
    if (report) return;
    let cancelled = false;
    void runAnalysisFn({ data: { symbol: "QQQ", settings: DEFAULT_SETTINGS } })
      .then((nextReport) => {
        if (!cancelled) setReport(nextReport);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [report, runAnalysisFn]);

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

  const hasNoResults = report.ranked.length === 0;

  return (
    <>
      <PageHeader
        eyebrow={`${isSample ? "Sample report · " : "Report · "}${report.request.symbol}`}
        title={`${report.summary.universeName} screen results`}
        description={`${new Date(report.generatedAt).toLocaleString()} · ${report.summary.constituentsScanned} constituents analyzed · ${report.summary.passedCount} passed filters · top ${report.summary.topCount} returned`}
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

      <div className="page-container space-y-8 py-10">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border bg-surface px-2.5 py-1">Last updated {new Date(report.generatedAt).toLocaleString()}</span>
          <span className="rounded-full border border-border bg-surface px-2.5 py-1">{report.summary.metricsAvailable}/{report.summary.constituentsScanned} stocks with metrics</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Data completeness {report.summary.dataCompletenessPct}%
          </span>
          {report.summary.partialDataCount > 0 ? (
            <span className="rounded-full border border-border bg-surface px-2.5 py-1">{report.summary.partialDataCount} ranked names include partial data</span>
          ) : null}
        </div>

        <SummaryCardsPlaceholder report={report} />

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">Ranked candidates</h2>
              <p className="text-xs text-muted-foreground">Click a row to inspect fundamentals and rationale</p>
            </div>
            {hasNoResults ? (
              <EmptyState
                title="No stocks passed the current filter set"
                description="The screen completed successfully, but no name cleared every hard filter."
                details={[
                  "Current pullback band is " + report.request.settings.minPullbackPct + "–" + report.request.settings.maxPullbackPct + "%.",
                  "Market-cap floor is $" + report.request.settings.minMarketCapB + "B and " + report.summary.rejectedCount + " names were rejected.",
                  "Try widening the pullback range, lowering the cap floor, or allowing names below the 200-day moving average.",
                ]}
                action={
                  <Link
                    to="/analyze"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface-elevated px-4 text-sm font-medium hover:bg-muted"
                  >
                    Edit settings
                  </Link>
                }
              />
            ) : (
              <RankedTablePlaceholder
                rows={report.ranked}
                onSelect={setSelected}
                selectedTicker={selected?.ticker}
              />
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight">Stock detail</h2>
            <StockDetailPlaceholder stock={selected} />
          </div>
        </div>

        <RejectedPanelPlaceholder rows={report.rejected} />

        <p className="text-center text-xs text-muted-foreground">
          This is a screening output built from live provider snapshots, not financial advice. See{" "}
          <Link to="/methodology" className="font-medium text-primary hover:underline">
            methodology
          </Link>{" "}
          for details.
        </p>
      </div>
    </>
  );
}
