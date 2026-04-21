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

interface FinnhubQuoteResponse {
  c?: number;
}

interface FinnhubMetricResponse {
  metric?: Record<string, number | string | null | undefined>;
}

interface FinnhubProfileResponse {
  finnhubIndustry?: string;
  marketCapitalization?: number;
}

const FINNHUB_REQUEST_BATCH_SIZE = 6;

export class FinnhubFundamentalsProvider implements FundamentalsProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args),
  ) {}

  async getMetrics(tickers: string[]): Promise<StockMetrics[]> {
    const normalizedTickers = [...new Set(tickers.map((ticker) => ticker.trim().toUpperCase()).filter(Boolean))];
    const metrics: StockMetrics[] = [];

    for (let index = 0; index < normalizedTickers.length; index += FINNHUB_REQUEST_BATCH_SIZE) {
      const batch = normalizedTickers.slice(index, index + FINNHUB_REQUEST_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (ticker) => {
          try {
            return await this.getTickerMetrics(ticker);
          } catch (error) {
            console.error(`Finnhub metrics failed for ${ticker}:`, error);
            return null;
          }
        }),
      );

      metrics.push(...batchResults.filter((entry): entry is StockMetrics => Boolean(entry)));
    }

    return metrics;
  }

  private async getTickerMetrics(ticker: string): Promise<StockMetrics> {
    const [quote, metricPayload, profile] = await Promise.all([
      this.fetchJson<FinnhubQuoteResponse>(`/quote?symbol=${encodeURIComponent(ticker)}`),
      this.fetchJson<FinnhubMetricResponse>(`/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all`),
      this.fetchJson<FinnhubProfileResponse>(`/stock/profile2?symbol=${encodeURIComponent(ticker)}`),
    ]);

    const metric = metricPayload.metric ?? {};
    const currentPrice = getNumber(quote.c);
    const high52Week = pickMetric(metric, ["52WeekHigh", "52WeekHighDaily"]);
    const low52Week = pickMetric(metric, ["52WeekLow", "52WeekLowDaily"]);
    const average200Day = pickMetric(metric, ["200DayAveragePrice"]);

    return {
      ticker,
      marketCapB: scaleMillionsToBillions(getNumber(profile.marketCapitalization)),
      currentPrice,
      high52Week,
      low52Week,
      pricePctFrom52WHigh:
        currentPrice != null && high52Week != null && high52Week > 0
          ? ((currentPrice - high52Week) / high52Week) * 100
          : undefined,
      above200dma:
        currentPrice != null && average200Day != null
          ? currentPrice >= average200Day
          : undefined,
      forwardPE: pickMetric(metric, ["peNormalizedAnnual", "forwardPE"]),
      trailingPE: pickMetric(metric, ["peTTM", "peBasicExclExtraTTM"]),
      evToEbitda: pickMetric(metric, ["evToEbitdaTTM", "ev/ebitdaAnnual", "enterpriseValueOverEBITDA"]),
      priceToBook: pickMetric(metric, ["pbAnnual", "priceToBookAnnual"]),
      revenueGrowthPct: asPercent(pickMetric(metric, ["revenueGrowthTTMYoy", "revenueGrowthQuarterlyYoy", "revenueGrowth3Y", "revenueGrowth5Y"])),
      earningsGrowthPct: asPercent(pickMetric(metric, ["epsGrowthTTMYoy", "epsGrowthQuarterlyYoy", "epsGrowth3Y", "epsGrowth5Y", "netIncomeGrowth5Y"])),
      operatingMarginPct: asPercent(pickMetric(metric, ["operatingMarginTTM", "operatingMarginAnnual", "operatingMargin5Y"])),
      grossMarginPct: asPercent(pickMetric(metric, ["grossMarginTTM", "grossMarginAnnual", "grossMargin5Y"])),
      returnOnEquityPct: asPercent(pickMetric(metric, ["roeTTM", "roeRfy", "roe5Y"])),
      freeCashFlowB: scaleMillionsToBillions(pickMetric(metric, ["freeCashFlowAnnual", "freeCashFlowTTM"])),
      debtToEquity: pickMetric(metric, ["totalDebt/totalEquityAnnual", "totalDebt/totalEquityQuarterly", "debtToEquityAnnual"]),
      beta: pickMetric(metric, ["beta"]),
    };
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const response = await this.fetchImpl(
      `https://finnhub.io/api/v1${path}${path.includes("?") ? "&" : "?"}token=${encodeURIComponent(this.apiKey)}`,
    );

    if (!response.ok) {
      throw new Error(`Provider failure while loading fundamentals (${response.status}).`);
    }

    return (await response.json()) as T;
  }
}

function pickMetric(
  metric: Record<string, number | string | null | undefined>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value = getNumber(metric[key]);
    if (value != null) return value;
  }
  return undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))
      ? Number(value)
      : undefined;
}

function asPercent(value: number | undefined): number | undefined {
  if (value == null) return undefined;
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function scaleMillionsToBillions(value: number | undefined): number | undefined {
  if (value == null) return undefined;
  return value / 1000;
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
    currentPrice: 472,
    high52Week: 601,
    low52Week: 433,
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
    currentPrice: 162,
    high52Week: 195,
    low52Week: 131,
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
    currentPrice: 167,
    high52Week: 204,
    low52Week: 154,
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
    currentPrice: 178,
    high52Week: 211,
    low52Week: 152,
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
    currentPrice: 601,
    high52Week: 742,
    low52Week: 553,
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
    currentPrice: 168,
    high52Week: 217,
    low52Week: 149,
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
    currentPrice: 67,
    high52Week: 81,
    low52Week: 61,
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
    currentPrice: 3512,
    high52Week: 4174,
    low52Week: 3089,
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
    currentPrice: 191,
    high52Week: 252,
    low52Week: 171,
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
    currentPrice: 50,
    high52Week: 57,
    low52Week: 44,
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
    currentPrice: 281,
    high52Week: 328,
    low52Week: 253,
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
    currentPrice: 151,
    high52Week: 207,
    low52Week: 132,
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
    currentPrice: 228,
    high52Week: 241,
    low52Week: 138,
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
    currentPrice: 641,
    high52Week: 661,
    low52Week: 446,
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
    currentPrice: 93,
    high52Week: 160,
    low52Week: 82,
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
    currentPrice: 63,
    high52Week: 78,
    low52Week: 55,
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
    currentPrice: 7.9,
    high52Week: 14.1,
    low52Week: 6.8,
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
    currentPrice: 421,
    high52Week: 441,
    low52Week: 324,
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
