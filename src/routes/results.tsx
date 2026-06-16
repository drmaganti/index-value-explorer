import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Sparkles, Bot, AlertTriangle } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";
import { ExecutiveSummary } from "../components/results/ExecutiveSummary";
import { RankedStockCard } from "../components/results/RankedStockCard";
import { RejectedPanelPlaceholder } from "../components/results/RejectedPanelPlaceholder";
import { DataQualityPanel } from "../components/results/DataQualityPanel";
import { MethodologySummary } from "../components/results/MethodologySummary";
import { Disclaimer } from "../components/results/Disclaimer";
import { getLastReport } from "../lib/analysis/reportStore";
import { runAnalysis } from "../lib/analysis/analysis.functions";
import { generateAnalysisNarrative, type AnalysisNarrative } from "../lib/ai/narrative.functions";
import { DEFAULT_SETTINGS } from "../lib/analysis/defaults";
import type { AnalysisReport } from "../lib/analysis/types";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Screen report — US Index Research" },
      {
        name: "description",
        content:
          "Transparent stock screening output: ranked candidates, rejection reasons, and data quality across SPY, QQQ, and DIA constituents.",
      },
      { property: "og:title", content: "Screen report — US Index Research" },
      {
        property: "og:description",
        content: "Ranked candidates, rejection reasons, and data quality from a deterministic US index stock screen.",
      },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const runAnalysisFn = useServerFn(runAnalysis);
  const narrativeFn = useServerFn(generateAnalysisNarrative);
  const [report, setReport] = useState<AnalysisReport | null>(() => getLastReport());
  const [narrative, setNarrative] = useState<AnalysisNarrative | null>(null);
  const [narrativeStatus, setNarrativeStatus] = useState<"idle" | "loading" | "error">("idle");
  const [narrativeError, setNarrativeError] = useState<string | null>(null);

  useEffect(() => {
    if (report) return;
    let cancelled = false;
    void runAnalysisFn({ data: { symbol: "SPY", settings: DEFAULT_SETTINGS } })
      .then((nextReport) => {
        if (!cancelled) setReport(nextReport);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [report, runAnalysisFn]);

  useEffect(() => {
    if (!report || report.ranked.length === 0) return;
    let cancelled = false;
    setNarrativeStatus("loading");
    setNarrativeError(null);
    void narrativeFn({
      data: {
        universeName: report.summary.universeName,
        symbol: report.request.symbol,
        mode: report.request.settings.mode,
        passedCount: report.summary.passedCount,
        rejectedCount: report.summary.rejectedCount,
        constituentsScanned: report.summary.constituentsScanned,
        dataCompletenessPct: report.summary.dataCompletenessPct,
        ranked: report.ranked.slice(0, 12).map((r) => ({
          rank: r.rank,
          ticker: r.ticker,
          name: r.name,
          sector: r.sector,
          score: r.score,
          pullbackPct: r.pullbackPct,
          marketCapB: r.marketCapB,
          forwardPE: r.forwardPE,
          trailingPE: r.trailingPE,
          evToEbitda: r.evToEbitda,
          operatingMarginPct: r.operatingMarginPct,
          revenueGrowthPct: r.revenueGrowthPct,
          earningsGrowthPct: r.earningsGrowthPct,
          freeCashFlowB: r.freeCashFlowB,
          debtToEquity: r.debtToEquity,
          returnOnEquityPct: r.returnOnEquityPct,
          above200dma: r.above200dma,
        })),
      },
    })
      .then((n) => {
        if (cancelled) return;
        setNarrative(n);
        setNarrativeStatus("idle");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setNarrativeError(err instanceof Error ? err.message : "AI narrative failed.");
        setNarrativeStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [report, narrativeFn]);

  if (!report) {
    return (
      <>
        <PageHeader eyebrow="Screen report" title="Loading sample report…" />
        <div className="mx-auto max-w-7xl px-6 py-10">
          <EmptyState title="Preparing a sample screen" description="Running the default SPY screen so you can see the report layout." />
        </div>
      </>
    );
  }

  const hasNoResults = report.ranked.length === 0;
  const lowCompleteness = report.summary.dataCompletenessPct < 70;

  return (
    <>
      <PageHeader
        eyebrow={`Screen report · ${report.request.symbol}`}
        title={`${report.summary.universeName} — ${report.summary.topCount} ranked candidates`}
        description={`Generated ${new Date(report.generatedAt).toLocaleString()} · ${report.summary.constituentsScanned} constituents scanned · ${report.summary.passedCount} passed filters · ${report.summary.rejectedCount} rejected.`}
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
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4" />
              New run
            </Link>
          </>
        }
      />

      <div className="page-container space-y-8 py-10">
        <ExecutiveSummary report={report} />

        {!hasNoResults ? (
          <section className="app-card p-5">
            <div className="flex items-center justify-between gap-2 text-sm font-semibold">
              <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
                AI research summary
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Neutral · no advice
              </span>
            </div>
            {narrativeStatus === "loading" && !narrative ? (
              <p className="mt-3 text-sm text-muted-foreground">Generating neutral commentary from the screen metrics…</p>
            ) : narrativeStatus === "error" ? (
              <p className="mt-3 text-sm text-destructive">{narrativeError}</p>
            ) : narrative?.summary ? (
              <p className="mt-3 text-sm leading-relaxed text-foreground">{narrative.summary}</p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No summary available.</p>
            )}
            {lowCompleteness ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1 text-[11px] text-destructive">
                <AlertTriangle className="h-3 w-3" />
                Data completeness is {report.summary.dataCompletenessPct}% — interpret commentary cautiously.
              </p>
            ) : null}
            <p className="mt-3 text-[11px] text-muted-foreground">
              The AI summary only describes the screen output. It cannot recommend buying or selling and does not generate price targets.
            </p>
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Top ranked stocks</h2>
              <p className="text-xs text-muted-foreground">
                Sorted by composite score. Expand each card for the strongest and weakest factors driving the score.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">{report.ranked.length} cards</span>
          </div>
          {hasNoResults ? (
            <EmptyState
              title="No stocks passed the current filter set"
              description="The screen completed successfully, but no name cleared every hard filter."
              details={[
                `Current pullback band is ${report.request.settings.minPullbackPct}–${report.request.settings.maxPullbackPct}%.`,
                `Market-cap floor is $${report.request.settings.minMarketCapB}B and ${report.summary.rejectedCount} names were rejected.`,
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
            <div className="grid gap-4 md:grid-cols-2">
              {report.ranked.map((stock) => (
                <div key={stock.ticker} className="space-y-2">
                  <RankedStockCard stock={stock} />
                  {narrative?.theses?.[stock.ticker.toUpperCase()] ? (
                    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">AI note · </span>
                      {narrative.theses[stock.ticker.toUpperCase()]}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <RejectedPanelPlaceholder rows={report.rejected} />

        <DataQualityPanel report={report} />

        <MethodologySummary />

        <Disclaimer />
      </div>
    </>
  );
}
