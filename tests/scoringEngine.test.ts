import { describe, expect, it } from "vitest";
import { computeScore, normalizeFactor } from "../src/services/scoring";
import {
  DEFAULT_FILTER_CONFIG,
  DEFAULT_SCORING_CONFIG,
} from "../src/services/config";
import { runScoringEngine } from "../src/services/scoringEngine";
import type { StockMetrics, IndexConstituent } from "../src/services/types";

describe("normalizeFactor", () => {
  it("maps 'lower is better' factors inversely", () => {
    // forwardPE bounds 8..40, lower better
    expect(normalizeFactor("forwardPE", 8)).toBeCloseTo(1, 5);
    expect(normalizeFactor("forwardPE", 40)).toBeCloseTo(0, 5);
    expect(normalizeFactor("forwardPE", 24)).toBeCloseTo(0.5, 1);
  });

  it("maps 'higher is better' factors directly", () => {
    expect(normalizeFactor("operatingMargin", 0)).toBeCloseTo(0, 5);
    expect(normalizeFactor("operatingMargin", 45)).toBeCloseTo(1, 5);
  });

  it("clamps out-of-range values", () => {
    expect(normalizeFactor("forwardPE", 4)).toBeCloseTo(1, 5);
    expect(normalizeFactor("forwardPE", 200)).toBeCloseTo(0, 5);
  });
});

describe("computeScore", () => {
  const great: StockMetrics = {
    ticker: "GREAT",
    marketCapB: 200, pricePctFrom52WHigh: -20, above200dma: true,
    forwardPE: 12, trailingPE: 14, evToEbitda: 9, priceToBook: 3,
    revenueGrowthPct: 18, earningsGrowthPct: 22,
    operatingMarginPct: 35, grossMarginPct: 70, returnOnEquityPct: 30,
    freeCashFlowB: 12, debtToEquity: 0.3, beta: 0.85,
  };
  const weak: StockMetrics = {
    ticker: "WEAK",
    marketCapB: 50, pricePctFrom52WHigh: -10, above200dma: false,
    forwardPE: 38, trailingPE: 42, evToEbitda: 28, priceToBook: 11,
    revenueGrowthPct: 1, earningsGrowthPct: -5,
    operatingMarginPct: 4, grossMarginPct: 25, returnOnEquityPct: 6,
    freeCashFlowB: 0.2, debtToEquity: 2.2, beta: 1.55,
  };

  it("scores a strong stock substantially above a weak one", () => {
    const s1 = computeScore(great, DEFAULT_SCORING_CONFIG).score;
    const s2 = computeScore(weak, DEFAULT_SCORING_CONFIG).score;
    expect(s1).toBeGreaterThan(s2 + 25);
  });

  it("returns weights summing to 1 across the breakdown", () => {
    const { breakdown } = computeScore(great, DEFAULT_SCORING_CONFIG);
    const total = breakdown.reduce((a, b) => a + b.weight, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("redistributes weight when factors are missing", () => {
    const sparse: StockMetrics = {
      ticker: "SPARSE",
      marketCapB: 100, pricePctFrom52WHigh: -15,
      forwardPE: 14, operatingMarginPct: 25,
    };
    const { breakdown, score } = computeScore(sparse, DEFAULT_SCORING_CONFIG);
    expect(breakdown.length).toBe(3); // forwardPE, drawdownFromHigh, operatingMargin
    expect(score).toBeGreaterThan(0);
  });
});

describe("runScoringEngine", () => {
  const constituents: IndexConstituent[] = [
    { ticker: "AAA", name: "Alpha Co", sector: "Tech" },
    { ticker: "BBB", name: "Beta Co", sector: "Tech" },
    { ticker: "CCC", name: "Gamma Co", sector: "Tech" },
  ];
  const metrics: StockMetrics[] = [
    {
      ticker: "AAA",
      marketCapB: 100, pricePctFrom52WHigh: -20, above200dma: true,
      forwardPE: 12, evToEbitda: 9, priceToBook: 3, trailingPE: 14,
      revenueGrowthPct: 12, earningsGrowthPct: 14,
      operatingMarginPct: 30, grossMarginPct: 60, returnOnEquityPct: 28,
      freeCashFlowB: 8, debtToEquity: 0.4, beta: 1.0,
    },
    {
      // Should be rejected: market cap too small
      ticker: "BBB",
      marketCapB: 5, pricePctFrom52WHigh: -15, above200dma: true,
      forwardPE: 18, operatingMarginPct: 20, revenueGrowthPct: 5,
      freeCashFlowB: 1, debtToEquity: 0.5,
    },
    // CCC has no metrics -> MISSING_METRICS
  ];

  it("partitions stocks into passed and rejected with correct counts", () => {
    const result = runScoringEngine({
      constituents,
      metrics,
      filters: DEFAULT_FILTER_CONFIG,
      scoring: DEFAULT_SCORING_CONFIG,
    });
    expect(result.passed.map((p) => p.ticker)).toEqual(["AAA"]);
    expect(result.rejected.map((r) => r.ticker).sort()).toEqual(["BBB", "CCC"]);
    expect(result.summary.constituentsScanned).toBe(3);
    expect(result.summary.passedCount).toBe(1);
    expect(result.summary.rejectedCount).toBe(2);
  });

  it("assigns ranks starting at 1 and respects topN", () => {
    const many: IndexConstituent[] = Array.from({ length: 5 }, (_, i) => ({
      ticker: `T${i}`,
      name: `Co ${i}`,
      sector: "Tech",
    }));
    const m: StockMetrics[] = many.map((c, i) => ({
      ticker: c.ticker,
      marketCapB: 100,
      pricePctFrom52WHigh: -15,
      forwardPE: 10 + i, // increasing -> score decreasing
      operatingMarginPct: 30 - i,
      revenueGrowthPct: 10,
      freeCashFlowB: 5,
      debtToEquity: 0.4,
    }));
    const result = runScoringEngine({
      constituents: many,
      metrics: m,
      filters: DEFAULT_FILTER_CONFIG,
      scoring: { ...DEFAULT_SCORING_CONFIG, topN: 3 },
    });
    expect(result.ranked.length).toBe(3);
    expect(result.ranked[0].rank).toBe(1);
    expect(result.ranked[0].score).toBeGreaterThanOrEqual(result.ranked[1].score);
  });
});
