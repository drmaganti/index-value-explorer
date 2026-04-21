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

    const text = await response.text();
    const trimmed = text.trim();

    if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
      throw new Error("Provider failure while loading fundamentals.");
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error("Provider failure while loading fundamentals.");
    }
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

