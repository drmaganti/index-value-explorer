import { normalizeTickerForProvider } from "./symbolNormalization";

type YahooNumber = number | { raw?: number } | null | undefined;

interface YahooQuoteSummary {
  price?: {
    regularMarketPrice?: YahooNumber;
    marketCap?: YahooNumber;
  };
  summaryDetail?: {
    marketCap?: YahooNumber;
    fiftyTwoWeekHigh?: YahooNumber;
    fiftyTwoWeekLow?: YahooNumber;
    twoHundredDayAverage?: YahooNumber;
    forwardPE?: YahooNumber;
    trailingPE?: YahooNumber;
    priceToSalesTrailing12Months?: YahooNumber;
    beta?: YahooNumber;
  };
  defaultKeyStatistics?: {
    enterpriseToEbitda?: YahooNumber;
    forwardPE?: YahooNumber;
    trailingEps?: YahooNumber;
    priceToBook?: YahooNumber;
    beta?: YahooNumber;
    earningsQuarterlyGrowth?: YahooNumber;
  };
  financialData?: {
    freeCashflow?: YahooNumber;
    operatingMargins?: YahooNumber;
    grossMargins?: YahooNumber;
    profitMargins?: YahooNumber;
    returnOnEquity?: YahooNumber;
    revenueGrowth?: YahooNumber;
    earningsGrowth?: YahooNumber;
    debtToEquity?: YahooNumber;
  };
}

interface YahooQuoteSummaryResponse {
  quoteSummary?: {
    result?: YahooQuoteSummary[] | null;
    error?: { code?: string; description?: string } | null;
  };
}

/**
 * Yahoo Finance supplemental provider — fills metrics that Finnhub's free
 * tier doesn't expose (EV/EBITDA, free cash flow) and also acts as a
 * fallback for the core price + market-cap fields when Finnhub returns
 * nothing (common for share-class tickers and recently listed names).
 *
 * Used to enrich (not replace) the primary Finnhub fundamentals payload.
 * Calls are best-effort: any per-ticker failure is logged and skipped so
 * one bad symbol can't break the whole run.
 */
export interface YahooSupplementalMetrics {
  ticker: string;
  marketCapB?: number;        // billions USD
  currentPrice?: number;
  high52Week?: number;
  low52Week?: number;
  pricePctFrom52WHigh?: number;
  above200dma?: boolean;
  evToEbitda?: number;
  freeCashFlowB?: number; // billions USD
  forwardPE?: number;
  trailingPE?: number;
  priceToBook?: number;
  revenueGrowthPct?: number;
  earningsGrowthPct?: number;
  operatingMarginPct?: number;
  grossMarginPct?: number;
  returnOnEquityPct?: number;
  debtToEquity?: number;
  beta?: number;
}

export class YahooFundamentalsProvider {
  private readonly concurrency: number;
  private readonly client: InstanceType<typeof YahooFinance>;

  constructor(concurrency = 6) {
    this.concurrency = concurrency;
    this.client = new YahooFinance({
      suppressNotices: ["yahooSurvey", "ripHistorical"],
    });
  }

  async getSupplementalMetrics(
    tickers: string[],
  ): Promise<YahooSupplementalMetrics[]> {
    const normalized = [
      ...new Set(tickers.map(normalizeTickerForProvider).filter(Boolean)),
    ];
    const results: YahooSupplementalMetrics[] = [];

    for (let i = 0; i < normalized.length; i += this.concurrency) {
      const batch = normalized.slice(i, i + this.concurrency);
      const batchResults = await Promise.all(
        batch.map((ticker) => this.getOne(ticker)),
      );
      for (const entry of batchResults) {
        if (entry) results.push(entry);
      }
    }

    return results;
  }

  private async getOne(
    ticker: string,
  ): Promise<YahooSupplementalMetrics | null> {
    try {
      const summary = (await this.client.quoteSummary(ticker, {
        modules: [
          "price",
          "summaryDetail",
          "defaultKeyStatistics",
          "financialData",
        ],
      })) as YahooQuoteSummary;

      const evToEbitda = readNumber(
        summary.defaultKeyStatistics?.enterpriseToEbitda,
      );
      const fcfRaw = readNumber(summary.financialData?.freeCashflow);
      const marketCapRaw = readNumber(
        summary.price?.marketCap ?? summary.summaryDetail?.marketCap,
      );
      const currentPrice = readNumber(summary.price?.regularMarketPrice);
      const high52Week = readNumber(summary.summaryDetail?.fiftyTwoWeekHigh);
      const low52Week = readNumber(summary.summaryDetail?.fiftyTwoWeekLow);
      const twoHundredDayAvg = readNumber(
        summary.summaryDetail?.twoHundredDayAverage,
      );

      const forwardPE = readNumber(
        summary.summaryDetail?.forwardPE ??
          summary.defaultKeyStatistics?.forwardPE,
      );
      const trailingPE = readNumber(summary.summaryDetail?.trailingPE);
      const priceToBook = readNumber(summary.defaultKeyStatistics?.priceToBook);
      const beta = readNumber(
        summary.summaryDetail?.beta ?? summary.defaultKeyStatistics?.beta,
      );

      // Yahoo returns margins/growth/ROE as decimals (0.34 = 34%); convert to %.
      const operatingMarginPct = pctFromDecimal(
        readNumber(summary.financialData?.operatingMargins),
      );
      const grossMarginPct = pctFromDecimal(
        readNumber(summary.financialData?.grossMargins),
      );
      const returnOnEquityPct = pctFromDecimal(
        readNumber(summary.financialData?.returnOnEquity),
      );
      const revenueGrowthPct = pctFromDecimal(
        readNumber(summary.financialData?.revenueGrowth),
      );
      const earningsGrowthPct = pctFromDecimal(
        readNumber(
          summary.financialData?.earningsGrowth ??
            summary.defaultKeyStatistics?.earningsQuarterlyGrowth,
        ),
      );

      // Yahoo's debtToEquity is reported as a percentage (e.g. 152 = 1.52).
      const debtToEquityRaw = readNumber(summary.financialData?.debtToEquity);
      const debtToEquity =
        debtToEquityRaw != null ? debtToEquityRaw / 100 : undefined;

      return {
        ticker,
        marketCapB: marketCapRaw != null ? marketCapRaw / 1_000_000_000 : undefined,
        currentPrice,
        high52Week,
        low52Week,
        pricePctFrom52WHigh:
          currentPrice != null && high52Week != null && high52Week > 0
            ? ((currentPrice - high52Week) / high52Week) * 100
            : undefined,
        above200dma:
          currentPrice != null && twoHundredDayAvg != null
            ? currentPrice >= twoHundredDayAvg
            : undefined,
        evToEbitda,
        freeCashFlowB: fcfRaw != null ? fcfRaw / 1_000_000_000 : undefined,
        forwardPE,
        trailingPE,
        priceToBook,
        revenueGrowthPct,
        earningsGrowthPct,
        operatingMarginPct,
        grossMarginPct,
        returnOnEquityPct,
        debtToEquity,
        beta,
      };
    } catch (error) {
      console.warn(`Yahoo supplemental metrics failed for ${ticker}:`, error);
      return null;
    }
  }
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    "raw" in (value as Record<string, unknown>)
  ) {
    const raw = (value as { raw?: unknown }).raw;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  }
  return undefined;
}

/**
 * Yahoo reports margins/growth/ROE as decimals (0.34 = 34%). Convert to a
 * whole-number percent to match the convention used elsewhere in the engine.
 */
function pctFromDecimal(value: number | undefined): number | undefined {
  if (value == null) return undefined;
  return value * 100;
}
