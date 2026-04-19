import type { FactorScore, StockMetrics } from "./types";

/**
 * Plain-English explanation builders.
 *
 * Generates short, deterministic snippets describing why a stock passed
 * the screen. Rejection reasons are produced by the filter pipeline
 * (see filters.ts) so we never duplicate that text generation here.
 */

const fmt = (n: number, digits = 1) => n.toFixed(digits);

/**
 * Build a single human-readable summary sentence for a passing stock.
 * Uses the metrics directly rather than the breakdown so phrasing reads
 * like a person wrote it, not a normalized-score explanation.
 */
export function buildPassSummary(name: string, m: StockMetrics): string {
  const parts: string[] = [];
  if (m.pricePctFrom52WHigh != null) {
    parts.push(`${fmt(Math.abs(m.pricePctFrom52WHigh))}% below its 52-week high`);
  }
  if (m.revenueGrowthPct != null && m.revenueGrowthPct > 0) {
    parts.push(`positive revenue growth of ${fmt(m.revenueGrowthPct)}%`);
  }
  if (m.operatingMarginPct != null && m.operatingMarginPct > 15) {
    parts.push(`healthy operating margins of ${fmt(m.operatingMarginPct)}%`);
  } else if (m.operatingMarginPct != null && m.operatingMarginPct > 0) {
    parts.push(`profitable operations`);
  }
  if (parts.length === 0) {
    return `${name} fits the long-horizon quality + value lens.`;
  }
  return `${name} is ${joinWithCommas(parts)}.`;
}

/**
 * Bullet-style highlights derived from the top-contributing factors.
 * Useful for the stock detail panel.
 */
export function buildPassReasons(m: StockMetrics, breakdown: FactorScore[], max = 4): string[] {
  // Sort by contribution (already weighted), take the top few that
  // genuinely look "good" (normalized > 0.55).
  const top = [...breakdown]
    .filter((b) => b.normalized > 0.55)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, max);

  return top.map((b) => factorBullet(b, m));
}

function factorBullet(b: FactorScore, m: StockMetrics): string {
  switch (b.factor) {
    case "drawdownFromHigh":
      return `Down ${fmt(Math.abs(m.pricePctFrom52WHigh ?? 0))}% from 52-week high — meaningful pullback without breaking trend.`;
    case "forwardPE":
      return `Forward P/E of ${fmt(m.forwardPE ?? 0)} sits at the cheaper end of its peer band.`;
    case "trailingPE":
      return `Trailing P/E of ${fmt(m.trailingPE ?? 0)} reflects an undemanding earnings multiple.`;
    case "evToEbitda":
      return `EV/EBITDA of ${fmt(m.evToEbitda ?? 0)} suggests reasonable enterprise valuation.`;
    case "priceToBook":
      return `Price/book of ${fmt(m.priceToBook ?? 0)} keeps balance-sheet expectations grounded.`;
    case "revenueGrowth":
      return `Revenue growth of ${fmt(m.revenueGrowthPct ?? 0)}% — top line still expanding.`;
    case "earningsGrowth":
      return `Earnings growth of ${fmt(m.earningsGrowthPct ?? 0)}% supports the score.`;
    case "operatingMargin":
      return `Operating margin of ${fmt(m.operatingMarginPct ?? 0)}% indicates durable profitability.`;
    case "grossMargin":
      return `Gross margin of ${fmt(m.grossMarginPct ?? 0)}% points to pricing power.`;
    case "returnOnEquity":
      return `ROE of ${fmt(m.returnOnEquityPct ?? 0)}% reflects efficient capital use.`;
    case "freeCashFlow":
      return `Free cash flow of $${fmt(m.freeCashFlowB ?? 0)}B funds buybacks and dividends.`;
    case "debtToEquity":
      return `Debt/equity of ${fmt(m.debtToEquity ?? 0, 2)} keeps leverage in check.`;
    case "beta":
      return `Beta of ${fmt(m.beta ?? 0, 2)} suggests a calmer ride versus the index.`;
  }
}

function joinWithCommas(parts: string[]): string {
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}
