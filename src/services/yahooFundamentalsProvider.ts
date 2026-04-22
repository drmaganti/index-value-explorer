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
  private readonly fetchImpl: typeof fetch;
  private credentialsPromise: Promise<YahooCredentials | null> | null = null;
  private quoteSummaryDisabledForRun = false;

  constructor(
    concurrency = 6,
    fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args),
  ) {
    this.concurrency = concurrency;
    this.fetchImpl = fetchImpl;
  }

  async getSupplementalMetrics(
    tickers: string[],
  ): Promise<YahooSupplementalMetrics[]> {
    const normalized = [
      ...new Set(tickers.map(normalizeTickerForProvider).filter(Boolean)),
    ];
    const results: YahooSupplementalMetrics[] = [];
    let quoteSummaryHits = 0;
    let v7FallbackHits = 0;
    let misses = 0;

    for (let i = 0; i < normalized.length; i += this.concurrency) {
      const batch = normalized.slice(i, i + this.concurrency);
      const batchResults = await Promise.all(
        batch.map((ticker) => this.getOne(ticker)),
      );
      for (const entry of batchResults) {
        if (!entry) {
          misses++;
          continue;
        }
        if (entry._source === "v7") v7FallbackHits++;
        else quoteSummaryHits++;
        // Strip internal marker before returning.
        const { _source, ...clean } = entry;
        void _source;
        results.push(clean);
      }
    }
    console.log(
      `[Yahoo] tickers=${normalized.length} quoteSummary=${quoteSummaryHits} v7Fallback=${v7FallbackHits} misses=${misses}`,
    );

    return results;
  }

  private async getOne(
    ticker: string,
  ): Promise<(YahooSupplementalMetrics & { _source: "qs" | "v7" }) | null> {
    try {
      let summary: YahooQuoteSummary | null = null;
      if (!this.quoteSummaryDisabledForRun) {
        summary = await this.fetchQuoteSummary(ticker);
      }
      if (!summary) {
        // Fall back to the unauthenticated v7 quote endpoint so at least
        // price + market cap + 52-week range come through. This is critical
        // for Indian (.NS / .BO) tickers, which Yahoo often refuses to serve
        // via quoteSummary from edge IPs (401 / "Invalid Crumb").
        const fallback = await this.fetchV7Quote(ticker);
        return fallback ? { ...fallback, _source: "v7" } : null;
      }

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
        _source: "qs",
      };
    } catch (error) {
      console.warn(`Yahoo supplemental metrics failed for ${ticker}:`, error);
      return null;
    }
  }

  private async fetchQuoteSummary(
    ticker: string,
  ): Promise<YahooQuoteSummary | null> {
    const creds = await this.getCredentials();
    const crumbParam = creds?.crumb ? `&crumb=${encodeURIComponent(creds.crumb)}` : "";
    const url = `${YAHOO_BASE}/${encodeURIComponent(ticker)}?modules=${YAHOO_MODULES}${crumbParam}`;
    const headers: Record<string, string> = {
      "User-Agent": YAHOO_USER_AGENT,
      Accept: "application/json",
    };
    if (creds?.cookie) headers.Cookie = creds.cookie;

    const res = await this.fetchImpl(url, { headers });
    if (!res.ok) {
      // 401 = Invalid Crumb (session rejected). 429 = rate-limited.
      // In either case stop hammering quoteSummary for the rest of the run
      // and let v7 fallback handle remaining tickers.
      if (res.status === 401 || res.status === 429) {
        if (!this.quoteSummaryDisabledForRun) {
          console.warn(
            `[Yahoo] quoteSummary returned ${res.status} for ${ticker} — disabling for the rest of this run, falling back to v7.`,
          );
        }
        this.quoteSummaryDisabledForRun = true;
      }
      return null;
    }
    const json = (await res.json()) as YahooQuoteSummaryResponse;
    const result = json.quoteSummary?.result?.[0];
    return result ?? null;
  }

  /**
   * Fallback path — Yahoo's v7 quote endpoint is unauthenticated and exposes
   * the bare minimum we need to get a ticker through the screen: price,
   * market cap, 52-week range, and 200-day moving average. Margin/growth/
   * ROE/FCF are absent here, so these tickers will be missing the deeper
   * factors but at least won't be silently dropped.
   */
  private async fetchV7Quote(
    ticker: string,
  ): Promise<YahooSupplementalMetrics | null> {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}`;
    const res = await this.fetchImpl(url, {
      headers: {
        "User-Agent": YAHOO_USER_AGENT,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as
      | { quoteResponse?: { result?: Array<Record<string, unknown>> } }
      | null;
    const row = json?.quoteResponse?.result?.[0];
    if (!row) return null;

    const num = (v: unknown): number | undefined =>
      typeof v === "number" && Number.isFinite(v) ? v : undefined;

    const currentPrice = num(row.regularMarketPrice);
    const high52Week = num(row.fiftyTwoWeekHigh);
    const low52Week = num(row.fiftyTwoWeekLow);
    const twoHundredDayAvg = num(row.twoHundredDayAverage);
    const marketCap = num(row.marketCap);

    return {
      ticker,
      marketCapB: marketCap != null ? marketCap / 1_000_000_000 : undefined,
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
      forwardPE: num(row.forwardPE),
      trailingPE: num(row.trailingPE),
      priceToBook: num(row.priceToBook),
    };
  }

  /**
   * Yahoo's quoteSummary endpoint started gating "deep" modules
   * (financialData, defaultKeyStatistics) behind a session cookie + crumb.
   * Without it, freeCashflow / EV-to-EBITDA come back missing or 401.
   *
   * The handshake:
   *  1. GET https://fc.yahoo.com  → returns Set-Cookie: A1=…; A3=…
   *  2. GET https://query2.finance.yahoo.com/v1/test/getcrumb with that
   *     Cookie header → returns the crumb token in the response body.
   *  3. Append &crumb=<token> + send Cookie on every quoteSummary call.
   *
   * Credentials are cached for the lifetime of this provider instance
   * (one analysis run) so we only do the handshake once per request.
   */
  private getCredentials(): Promise<YahooCredentials | null> {
    if (!this.credentialsPromise) {
      this.credentialsPromise = this.handshake().catch((error) => {
        console.warn("Yahoo cookie/crumb handshake failed:", error);
        return null;
      });
    }
    return this.credentialsPromise;
  }

  private async handshake(): Promise<YahooCredentials | null> {
    // Step 1 — collect the session cookies from fc.yahoo.com.
    // We use `redirect: "manual"` so Workers don't follow the EU consent
    // 302 (which would lose the Set-Cookie headers).
    const cookieRes = await this.fetchImpl("https://fc.yahoo.com/", {
      headers: { "User-Agent": YAHOO_USER_AGENT },
      redirect: "manual",
    });
    const cookie = extractCookie(cookieRes);
    if (!cookie) return null;

    // Step 2 — exchange the cookie for a crumb token.
    const crumbRes = await this.fetchImpl(
      "https://query2.finance.yahoo.com/v1/test/getcrumb",
      {
        headers: {
          "User-Agent": YAHOO_USER_AGENT,
          Cookie: cookie,
          Accept: "text/plain",
        },
      },
    );
    if (!crumbRes.ok) return null;
    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.length > 64) return null; // sanity guard

    return { cookie, crumb };
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

const YAHOO_BASE = "https://query2.finance.yahoo.com/v10/finance/quoteSummary";
const YAHOO_MODULES = "price,summaryDetail,defaultKeyStatistics,financialData";
const YAHOO_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface YahooCredentials {
  cookie: string;
  crumb: string;
}

/**
 * Pull a `cookie` request-header value from a response's Set-Cookie headers.
 * We only keep the `name=value` portion (no Path/Expires/etc.) and join with
 * `; ` per RFC 6265. Yahoo's important cookies are A1 / A3 / GUC.
 */
function extractCookie(response: Response): string | null {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies: string[] = headers.getSetCookie
    ? headers.getSetCookie()
    : (() => {
        const single = response.headers.get("set-cookie");
        return single ? [single] : [];
      })();

  const pairs: string[] = [];
  for (const raw of setCookies) {
    const firstPair = raw.split(";")[0]?.trim();
    if (firstPair && firstPair.includes("=")) pairs.push(firstPair);
  }
  return pairs.length > 0 ? pairs.join("; ") : null;
}
