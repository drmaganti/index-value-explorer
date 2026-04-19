/**
 * Public services barrel.
 *
 * Import from "@/services" anywhere in the app rather than reaching into
 * individual files — keeps the module boundary clean.
 */
export * from "./types";
export * from "./config";
export { runScoringEngine, constituentsToTickers } from "./scoringEngine";
export { runFilters, FILTER_PIPELINE } from "./filters";
export { computeScore, normalizeFactor } from "./scoring";
export { buildPassReasons, buildPassSummary } from "./explanations";
export { buildReportFromEngine } from "./reportBuilder";
export {
  type IndexProvider,
  MockIndexProvider,
  mockIndexProvider,
} from "./indexProvider";
export {
  type FundamentalsProvider,
  MockFundamentalsProvider,
  mockFundamentalsProvider,
} from "./fundamentalsProvider";
