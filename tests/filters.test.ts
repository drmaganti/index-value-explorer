import { describe, expect, it } from "vitest";
import {
  filter200DMA,
  filterFreeCashFlow,
  filterLeverage,
  filterMarketCap,
  filterMissingMetrics,
  filterOperatingMargin,
  filterPullback,
  filterRevenueGrowth,
  runFilters,
} from "../src/services/filters";
import type { FilterConfig, StockMetrics } from "../src/services/types";
import { DEFAULT_FILTER_CONFIG } from "../src/services/config";

const baseCfg: FilterConfig = { ...DEFAULT_FILTER_CONFIG };

const okStock: StockMetrics = {
  ticker: "OK",
  marketCapB: 100,
  pricePctFrom52WHigh: -15,
  above200dma: true,
  forwardPE: 18,
  trailingPE: 22,
  evToEbitda: 14,
  priceToBook: 4,
  revenueGrowthPct: 8,
  earningsGrowthPct: 10,
  operatingMarginPct: 22,
  grossMarginPct: 55,
  returnOnEquityPct: 25,
  freeCashFlowB: 5,
  debtToEquity: 0.6,
  beta: 1.0,
};

describe("filters", () => {
  it("passes a clean stock under default config", () => {
    expect(runFilters(okStock, baseCfg)).toEqual([]);
  });

  it("rejects when core metrics are missing", () => {
    const r = filterMissingMetrics(
      { ticker: "X", marketCapB: undefined, pricePctFrom52WHigh: undefined },
      baseCfg,
    );
    expect(r?.code).toBe("MISSING_METRICS");
  });

  it("rejects market cap below floor", () => {
    const r = filterMarketCap({ ...okStock, marketCapB: 10 }, baseCfg);
    expect(r?.code).toBe("MARKET_CAP_TOO_SMALL");
  });

  it("flags both insufficient and excessive pullback", () => {
    expect(filterPullback({ ...okStock, pricePctFrom52WHigh: -3 }, baseCfg)?.code)
      .toBe("INSUFFICIENT_PULLBACK");
    expect(filterPullback({ ...okStock, pricePctFrom52WHigh: -50 }, baseCfg)?.code)
      .toBe("EXCESSIVE_PULLBACK");
  });

  it("rejects negative revenue growth when required", () => {
    expect(
      filterRevenueGrowth({ ...okStock, revenueGrowthPct: -2 }, baseCfg)?.code,
    ).toBe("NEGATIVE_REVENUE_GROWTH");
    // disabled: should pass
    expect(
      filterRevenueGrowth(
        { ...okStock, revenueGrowthPct: -2 },
        { ...baseCfg, requirePositiveRevenueGrowth: false },
      ),
    ).toBeNull();
  });

  it("rejects non-positive operating margin", () => {
    expect(
      filterOperatingMargin({ ...okStock, operatingMarginPct: 0 }, baseCfg)?.code,
    ).toBe("NEGATIVE_OPERATING_MARGIN");
  });

  it("rejects negative FCF only when required", () => {
    expect(
      filterFreeCashFlow({ ...okStock, freeCashFlowB: -1 }, baseCfg),
    ).toBeNull();
    expect(
      filterFreeCashFlow(
        { ...okStock, freeCashFlowB: -1 },
        { ...baseCfg, requirePositiveFcf: true },
      )?.code,
    ).toBe("NEGATIVE_FCF");
  });

  it("rejects excessive leverage", () => {
    expect(filterLeverage({ ...okStock, debtToEquity: 5.5 }, baseCfg)?.code)
      .toBe("EXCESSIVE_LEVERAGE");
  });

  it("rejects below-200DMA only when required", () => {
    expect(filter200DMA({ ...okStock, above200dma: false }, baseCfg)).toBeNull();
    expect(
      filter200DMA(
        { ...okStock, above200dma: false },
        { ...baseCfg, requireAbove200dma: true },
      )?.code,
    ).toBe("BELOW_200DMA");
  });

  it("returns reasons in deterministic pipeline order", () => {
    const bad: StockMetrics = {
      ...okStock,
      marketCapB: 5,
      pricePctFrom52WHigh: -3,
      revenueGrowthPct: -10,
      operatingMarginPct: -2,
    };
    const reasons = runFilters(bad, baseCfg);
    expect(reasons.map((r) => r.code)).toEqual([
      "MARKET_CAP_TOO_SMALL",
      "INSUFFICIENT_PULLBACK",
      "NEGATIVE_REVENUE_GROWTH",
      "NEGATIVE_OPERATING_MARGIN",
    ]);
  });
});
