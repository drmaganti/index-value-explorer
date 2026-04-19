import type { StockMetrics } from "./types";

/**
 * Fundamentals provider — returns metric snapshots for a list of tickers.
 *
 * Pluggable: real implementations will hit a market data API. The mock
 * implementation below ships hand-tuned, intentionally varied payloads
 * so the screening engine produces interesting filtering and ranking.
 */
export interface FundamentalsProvider {
  getMetrics(tickers: string[]): Promise<StockMetrics[]>;
}

/* ------------------------------------------------------------------ */
/* Mock dataset — 18 companies spanning quality, value, and trash.    */
/* Numbers are illustrative, not real-time data.                      */
/* ------------------------------------------------------------------ */

const MOCK_METRICS: Record<string, StockMetrics> = {
  // Strong quality + meaningful pullback (should rank high)
  ADBE: {
    ticker: "ADBE",
    marketCapB: 240,
    pricePctFrom52WHigh: -21.4,
    above200dma: true,
    forwardPE: 22, trailingPE: 30, evToEbitda: 19, priceToBook: 11,
    revenueGrowthPct: 11, earningsGrowthPct: 14,
    operatingMarginPct: 35, grossMarginPct: 88, returnOnEquityPct: 36,
    freeCashFlowB: 7.8, debtToEquity: 0.5, beta: 1.1,
  },
  GOOGL: {
    ticker: "GOOGL",
    marketCapB: 1900,
    pricePctFrom52WHigh: -16.8,
    above200dma: true,
    forwardPE: 19, trailingPE: 22, evToEbitda: 14, priceToBook: 6.5,
    revenueGrowthPct: 13, earningsGrowthPct: 18,
    operatingMarginPct: 30, grossMarginPct: 57, returnOnEquityPct: 30,
    freeCashFlowB: 70, debtToEquity: 0.1, beta: 1.05,
  },
  PEP: {
    ticker: "PEP",
    marketCapB: 230,
    pricePctFrom52WHigh: -18.2,
    above200dma: false,
    forwardPE: 18, trailingPE: 22, evToEbitda: 15, priceToBook: 11,
    revenueGrowthPct: 5, earningsGrowthPct: 7,
    operatingMarginPct: 14, grossMarginPct: 55, returnOnEquityPct: 50,
    freeCashFlowB: 8.5, debtToEquity: 1.8, beta: 0.6,
  },
  TXN: {
    ticker: "TXN",
    marketCapB: 165,
    pricePctFrom52WHigh: -15.6,
    above200dma: true,
    forwardPE: 24, trailingPE: 28, evToEbitda: 18, priceToBook: 10,
    revenueGrowthPct: 3, earningsGrowthPct: 5,
    operatingMarginPct: 38, grossMarginPct: 62, returnOnEquityPct: 35,
    freeCashFlowB: 5.3, debtToEquity: 0.9, beta: 1.0,
  },
  INTU: {
    ticker: "INTU",
    marketCapB: 175,
    pricePctFrom52WHigh: -19.0,
    above200dma: true,
    forwardPE: 28, trailingPE: 36, evToEbitda: 22, priceToBook: 8.5,
    revenueGrowthPct: 12, earningsGrowthPct: 16,
    operatingMarginPct: 24, grossMarginPct: 80, returnOnEquityPct: 18,
    freeCashFlowB: 4.6, debtToEquity: 0.7, beta: 1.15,
  },
  QCOM: {
    ticker: "QCOM",
    marketCapB: 180,
    pricePctFrom52WHigh: -22.5,
    above200dma: false,
    forwardPE: 14, trailingPE: 17, evToEbitda: 11, priceToBook: 7,
    revenueGrowthPct: 6, earningsGrowthPct: 10,
    operatingMarginPct: 28, grossMarginPct: 56, returnOnEquityPct: 38,
    freeCashFlowB: 9.1, debtToEquity: 0.7, beta: 1.25,
  },
  MDLZ: {
    ticker: "MDLZ",
    marketCapB: 95,
    pricePctFrom52WHigh: -17.3,
    above200dma: false,
    forwardPE: 17, trailingPE: 20, evToEbitda: 14, priceToBook: 3.5,
    revenueGrowthPct: 4, earningsGrowthPct: 6,
    operatingMarginPct: 17, grossMarginPct: 38, returnOnEquityPct: 14,
    freeCashFlowB: 3.6, debtToEquity: 0.8, beta: 0.55,
  },
  BKNG: {
    ticker: "BKNG",
    marketCapB: 130,
    pricePctFrom52WHigh: -15.9,
    above200dma: true,
    forwardPE: 20, trailingPE: 25, evToEbitda: 16, priceToBook: 35, // P/B distorted (buybacks)
    revenueGrowthPct: 14, earningsGrowthPct: 20,
    operatingMarginPct: 31, grossMarginPct: 86, returnOnEquityPct: 80,
    freeCashFlowB: 7.0, debtToEquity: 1.5, beta: 1.2,
  },
  AMAT: {
    ticker: "AMAT",
    marketCapB: 145,
    pricePctFrom52WHigh: -24.1,
    above200dma: false,
    forwardPE: 16, trailingPE: 19, evToEbitda: 13, priceToBook: 8,
    revenueGrowthPct: 4, earningsGrowthPct: 5,
    operatingMarginPct: 29, grossMarginPct: 47, returnOnEquityPct: 47,
    freeCashFlowB: 7.5, debtToEquity: 0.5, beta: 1.5,
  },
  CSCO: {
    ticker: "CSCO",
    marketCapB: 200,
    pricePctFrom52WHigh: -12.8,        // edge: just under min pullback if 8%
    above200dma: true,
    forwardPE: 14, trailingPE: 16, evToEbitda: 11, priceToBook: 5,
    revenueGrowthPct: 2, earningsGrowthPct: 3,
    operatingMarginPct: 27, grossMarginPct: 64, returnOnEquityPct: 27,
    freeCashFlowB: 12, debtToEquity: 0.6, beta: 0.85,
  },
  AMGN: {
    ticker: "AMGN",
    marketCapB: 160,
    pricePctFrom52WHigh: -14.2,
    above200dma: true,
    forwardPE: 15, trailingPE: 18, evToEbitda: 12, priceToBook: 28,
    revenueGrowthPct: 6, earningsGrowthPct: 7,
    operatingMarginPct: 35, grossMarginPct: 70, returnOnEquityPct: 100,
    freeCashFlowB: 9.0, debtToEquity: 5.5, beta: 0.6,    // very high D/E
  },

  // --- Edge cases / rejects ---

  AMD: {
    // Big pullback, decent quality — should pass.
    ticker: "AMD",
    marketCapB: 230,
    pricePctFrom52WHigh: -27.1,
    above200dma: false,
    forwardPE: 28, trailingPE: 60, evToEbitda: 22, priceToBook: 4,
    revenueGrowthPct: 9, earningsGrowthPct: 22,
    operatingMarginPct: 12, grossMarginPct: 50, returnOnEquityPct: 8,
    freeCashFlowB: 1.4, debtToEquity: 0.1, beta: 1.65,
  },
  TSLA: {
    // Insufficient pullback — reject.
    ticker: "TSLA",
    marketCapB: 800,
    pricePctFrom52WHigh: -5.2,
    above200dma: true,
    forwardPE: 70, trailingPE: 90, evToEbitda: 50, priceToBook: 12,
    revenueGrowthPct: 2, earningsGrowthPct: -10,
    operatingMarginPct: 8, grossMarginPct: 18, returnOnEquityPct: 14,
    freeCashFlowB: 4.3, debtToEquity: 0.2, beta: 2.0,
  },
  NFLX: {
    // Above max pullback range AND below 200dma — reject.
    ticker: "NFLX",
    marketCapB: 270,
    pricePctFrom52WHigh: -3.0,
    above200dma: true,
    forwardPE: 35, trailingPE: 45, evToEbitda: 28, priceToBook: 14,
    revenueGrowthPct: 15, earningsGrowthPct: 20,
    operatingMarginPct: 24, grossMarginPct: 42, returnOnEquityPct: 27,
    freeCashFlowB: 6.9, debtToEquity: 0.7, beta: 1.3,
  },
  MRNA: {
    // Negative revenue growth + negative op margin — multi-reason reject.
    ticker: "MRNA",
    marketCapB: 30,
    pricePctFrom52WHigh: -42.0,
    above200dma: false,
    forwardPE: undefined, trailingPE: undefined, evToEbitda: undefined, priceToBook: 1.6,
    revenueGrowthPct: -45, earningsGrowthPct: -120,
    operatingMarginPct: -55, grossMarginPct: 12, returnOnEquityPct: -30,
    freeCashFlowB: -3.2, debtToEquity: 0.05, beta: 1.4,
  },
  PYPL: {
    // Borderline; passes filters but lower score.
    ticker: "PYPL",
    marketCapB: 70,
    pricePctFrom52WHigh: -19.5,
    above200dma: false,
    forwardPE: 12, trailingPE: 16, evToEbitda: 10, priceToBook: 3.5,
    revenueGrowthPct: 8, earningsGrowthPct: 5,
    operatingMarginPct: 17, grossMarginPct: 41, returnOnEquityPct: 21,
    freeCashFlowB: 4.5, debtToEquity: 0.6, beta: 1.45,
  },
  WBD: {
    // Excessive leverage + negative growth — reject.
    ticker: "WBD",
    marketCapB: 22,
    pricePctFrom52WHigh: -38.0,
    above200dma: false,
    forwardPE: undefined, trailingPE: undefined, evToEbitda: 8, priceToBook: 0.6,
    revenueGrowthPct: -4, earningsGrowthPct: -20,
    operatingMarginPct: 6, grossMarginPct: 41, returnOnEquityPct: -8,
    freeCashFlowB: 4.2, debtToEquity: 1.2, beta: 1.5,
  },
  MSFT: {
    // Insufficient pullback in our snapshot — reject.
    ticker: "MSFT",
    marketCapB: 3100,
    pricePctFrom52WHigh: -4.5,
    above200dma: true,
    forwardPE: 30, trailingPE: 35, evToEbitda: 22, priceToBook: 11,
    revenueGrowthPct: 14, earningsGrowthPct: 17,
    operatingMarginPct: 44, grossMarginPct: 70, returnOnEquityPct: 39,
    freeCashFlowB: 70, debtToEquity: 0.4, beta: 0.9,
  },
};

export class MockFundamentalsProvider implements FundamentalsProvider {
  async getMetrics(tickers: string[]): Promise<StockMetrics[]> {
    return tickers
      .map((t) => MOCK_METRICS[t.toUpperCase()])
      .filter((m): m is StockMetrics => Boolean(m));
  }
}

export const mockFundamentalsProvider = new MockFundamentalsProvider();
