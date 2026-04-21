import yahooFinance from "yahoo-finance2";

interface YahooQuoteSummary {
  defaultKeyStatistics?: {
    enterpriseToEbitda?: number | null;
  };
  financialData?: {
    freeCashflow?: number | null;
  };
}

/**
 * Yahoo Finance supplemental provider — fills metrics that Finnhub's free
 * tier doesn't expose: enterprise value / EBITDA and free cash flow.
 *
 * Used to enrich (not replace) the primary Finnhub fundamentals payload.
 * Calls are best-effort: any per-ticker failure is logged and skipped so
 * one bad symbol can't break the whole run.
 */
export interface YahooSupplementalMetrics {
  ticker: string;
  evToEbitda?: number;
  freeCashFlowB?: number; // billions USD
}

export class YahooFundamentalsProvider {
  private readonly concurrency: number;

  constructor(concurrency = 6) {
    this.concurrency = concurrency;
  }

  async getSupplementalMetrics(
    tickers: string[],
  ): Promise<YahooSupplementalMetrics[]> {
    const normalized = [
      ...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean)),
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
      const summary = (await yahooFinance.quoteSummary(ticker, {
        modules: ["defaultKeyStatistics", "financialData"],
      })) as YahooQuoteSummary;

      const evToEbitda = readNumber(
        summary.defaultKeyStatistics?.enterpriseToEbitda,
      );
      const fcfRaw = readNumber(summary.financialData?.freeCashflow);

      return {
        ticker,
        evToEbitda,
        freeCashFlowB: fcfRaw != null ? fcfRaw / 1_000_000_000 : undefined,
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
