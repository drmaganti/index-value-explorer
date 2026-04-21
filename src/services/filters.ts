import type {
  FilterConfig,
  RejectionDetail,
  StockMetrics,
} from "./types";

/**
 * Hard filters for the screening engine.
 *
 * Every filter returns either nothing (pass) or a RejectionDetail with a
 * deterministic code + plain-English message. Filters are pure and
 * independent — easy to unit test in isolation.
 *
 * Rules use `??` rather than truthiness checks because metrics can
 * legitimately be 0 (e.g. zero debt, zero growth).
 */

export type Filter = (m: StockMetrics, cfg: FilterConfig) => RejectionDetail | null;

const fmt = (n: number, digits = 1) => n.toFixed(digits);

export const filterMissingMetrics: Filter = (m) => {
  // We require enough data to make a meaningful decision. If the core
  // pullback + market cap fields are absent, the stock is unscreenable.
  const missing: string[] = [];
  if (m.marketCapB == null) missing.push("market cap");
  if (m.pricePctFrom52WHigh == null) missing.push("52-week price history");
  if (missing.length > 0) {
    return {
      code: "MISSING_METRICS",
      message: `Provider returned a partial record — missing ${missing.join(" and ")}.`,
    };
  }
  return null;
};

export const filterMarketCap: Filter = (m, cfg) => {
  if (m.marketCapB == null) return null; // covered by MISSING_METRICS
  if (m.marketCapB < cfg.minMarketCapB) {
    return {
      code: "MARKET_CAP_TOO_SMALL",
      message: `Market cap of $${fmt(m.marketCapB, 1)}B is below the $${cfg.minMarketCapB}B floor.`,
    };
  }
  return null;
};

export const filterPullback: Filter = (m, cfg) => {
  if (m.pricePctFrom52WHigh == null) return null;
  const drawdown = Math.abs(m.pricePctFrom52WHigh);
  if (drawdown < cfg.minPullbackPct) {
    return {
      code: "INSUFFICIENT_PULLBACK",
      message: `Only ${fmt(drawdown)}% off 52-week high (need at least ${cfg.minPullbackPct}%).`,
    };
  }
  if (drawdown > cfg.maxPullbackPct) {
    return {
      code: "EXCESSIVE_PULLBACK",
      message: `Down ${fmt(drawdown)}% from highs — beyond the ${cfg.maxPullbackPct}% ceiling (potential broken trend).`,
    };
  }
  return null;
};

export const filterRevenueGrowth: Filter = (m, cfg) => {
  if (!cfg.requirePositiveRevenueGrowth) return null;
  if (m.revenueGrowthPct == null) return null; // unknown is allowed
  if (m.revenueGrowthPct < 0) {
    return {
      code: "NEGATIVE_REVENUE_GROWTH",
      message: `Revenue growth is ${fmt(m.revenueGrowthPct)}% — declining top line.`,
    };
  }
  return null;
};

export const filterOperatingMargin: Filter = (m, cfg) => {
  if (m.operatingMarginPct == null) return null;
  if (m.operatingMarginPct <= cfg.minOperatingMarginPct) {
    return {
      code: "NEGATIVE_OPERATING_MARGIN",
      message:
        cfg.minOperatingMarginPct === 0
          ? `Operating margin of ${fmt(m.operatingMarginPct)}% is not positive.`
          : `Operating margin of ${fmt(m.operatingMarginPct)}% is below the ${cfg.minOperatingMarginPct}% floor.`,
    };
  }
  return null;
};

export const filterFreeCashFlow: Filter = (m, cfg) => {
  if (!cfg.requirePositiveFcf) return null;
  if (m.freeCashFlowB == null) return null;
  if (m.freeCashFlowB <= 0) {
    return {
      code: "NEGATIVE_FCF",
      message: `Free cash flow is $${fmt(m.freeCashFlowB)}B — burning cash.`,
    };
  }
  return null;
};

export const filterLeverage: Filter = (m, cfg) => {
  if (m.debtToEquity == null) return null;
  if (m.debtToEquity > cfg.maxDebtToEquity) {
    return {
      code: "EXCESSIVE_LEVERAGE",
      message: `Debt/equity of ${fmt(m.debtToEquity, 2)} exceeds the ${fmt(cfg.maxDebtToEquity, 1)} ceiling.`,
    };
  }
  return null;
};

export const filter200DMA: Filter = (m, cfg) => {
  if (!cfg.requireAbove200dma) return null;
  if (m.above200dma === false) {
    return {
      code: "BELOW_200DMA",
      message: "Trading below its 200-day moving average — long-term trend broken.",
    };
  }
  return null;
};

/**
 * Ordered filter pipeline. Order matters for explainability:
 * fundamental data quality → size → opportunity setup → quality.
 */
export const FILTER_PIPELINE: Filter[] = [
  filterMissingMetrics,
  filterMarketCap,
  filterPullback,
  filterRevenueGrowth,
  filterOperatingMargin,
  filterFreeCashFlow,
  filterLeverage,
  filter200DMA,
];

/** Run all filters and return every reason a stock failed (deterministic order). */
export function runFilters(
  metrics: StockMetrics,
  cfg: FilterConfig,
  pipeline: Filter[] = FILTER_PIPELINE,
): RejectionDetail[] {
  const reasons: RejectionDetail[] = [];
  for (const f of pipeline) {
    const r = f(metrics, cfg);
    if (r) reasons.push(r);
  }
  return reasons;
}
