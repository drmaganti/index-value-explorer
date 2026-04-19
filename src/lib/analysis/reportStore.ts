import type { AnalysisReport } from "./types";

/**
 * Tiny in-memory store so the analyze page can hand a generated
 * report off to the results page on navigation. When we wire a real
 * backend, this becomes a query cache lookup instead.
 */

let lastReport: AnalysisReport | null = null;

export function setLastReport(report: AnalysisReport): void {
  lastReport = report;
}

export function getLastReport(): AnalysisReport | null {
  return lastReport;
}

export function clearLastReport(): void {
  lastReport = null;
}
