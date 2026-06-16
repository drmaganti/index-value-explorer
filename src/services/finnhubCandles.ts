import { withFinnhubLimit } from "./finnhubRateLimiter";

export interface DailyPriceSnapshot {
  closePrice: number | null;
  previousClose: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  twoHundredDayMovingAverage: number | null;
  drawdownFromHighPct: number | null;
  tradeDateISO: string | null;
}

interface FinnhubCandleResponse {
  s?: string;
  c?: number[];
  h?: number[];
  l?: number[];
  t?: number[];
}

/**
 * One Finnhub `/stock/candle` call per ticker — replaces the 3-call
 * quote+metric+profile flow for price-related fields. Returns enough
 * history to derive 52w high/low, 200DMA, and drawdown from high.
 */
export async function fetchDailyCandleSnapshot(
  ticker: string,
  apiKey: string,
  fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args),
): Promise<DailyPriceSnapshot> {
  const now = Math.floor(Date.now() / 1000);
  const oneYearAgo = now - 60 * 60 * 24 * 380; // ~380d gives buffer for 52w & 200DMA
  const url =
    `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(ticker)}` +
    `&resolution=D&from=${oneYearAgo}&to=${now}&token=${encodeURIComponent(apiKey)}`;

  const payload = await withFinnhubLimit<FinnhubCandleResponse>(
    () => fetchImpl(url),
    (res) => res.json() as Promise<FinnhubCandleResponse>,
  );

  if (payload.s !== "ok" || !payload.c || payload.c.length === 0) {
    return {
      closePrice: null,
      previousClose: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      twoHundredDayMovingAverage: null,
      drawdownFromHighPct: null,
      tradeDateISO: null,
    };
  }

  const closes = payload.c;
  const highs = payload.h ?? closes;
  const lows = payload.l ?? closes;
  const times = payload.t ?? [];

  const lastIdx = closes.length - 1;
  const closePrice = closes[lastIdx] ?? null;
  const previousClose = lastIdx > 0 ? closes[lastIdx - 1] : null;

  // 52-week window = last 252 trading days
  const wIdx = Math.max(0, closes.length - 252);
  const window52High = Math.max(...highs.slice(wIdx));
  const window52Low = Math.min(...lows.slice(wIdx));

  // 200DMA — average of last 200 closes (if we have them).
  const dmaStart = Math.max(0, closes.length - 200);
  const dmaSlice = closes.slice(dmaStart);
  const twoHundredDma =
    dmaSlice.length >= 50 ? dmaSlice.reduce((a, b) => a + b, 0) / dmaSlice.length : null;

  const drawdown =
    closePrice != null && window52High > 0
      ? ((closePrice - window52High) / window52High) * 100
      : null;

  const tradeDateISO =
    times.length > 0
      ? new Date(times[lastIdx] * 1000).toISOString().slice(0, 10)
      : null;

  return {
    closePrice,
    previousClose,
    fiftyTwoWeekHigh: Number.isFinite(window52High) ? window52High : null,
    fiftyTwoWeekLow: Number.isFinite(window52Low) ? window52Low : null,
    twoHundredDayMovingAverage: twoHundredDma,
    drawdownFromHighPct: drawdown,
    tradeDateISO,
  };
}

interface FinnhubMetricResponse {
  metric?: Record<string, number | string | null | undefined>;
}

export interface FundamentalsRow {
  marketCapB: number | null;
  forwardPE: number | null;
  trailingPE: number | null;
  evToEbitda: number | null;
  priceToBook: number | null;
  revenueGrowthPct: number | null;
  earningsGrowthPct: number | null;
  operatingMarginPct: number | null;
  grossMarginPct: number | null;
  returnOnEquityPct: number | null;
  freeCashFlowB: number | null;
  debtToEquity: number | null;
  beta: number | null;
}

/**
 * Fetch only the `/stock/metric` endpoint — 1 call. Excludes profile2
 * (industry / market cap) so we stay within the per-ticker budget.
 */
export async function fetchFundamentalsRow(
  ticker: string,
  apiKey: string,
  fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args),
): Promise<FundamentalsRow> {
  const url = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all&token=${encodeURIComponent(apiKey)}`;
  const payload = await withFinnhubLimit<FinnhubMetricResponse>(
    () => fetchImpl(url),
    (res) => res.json() as Promise<FinnhubMetricResponse>,
  );
  const m = payload.metric ?? {};
  return {
    marketCapB: scaleMillionsToBillions(pickMetric(m, ["marketCapitalization"])),
    forwardPE: pickMetric(m, ["peNormalizedAnnual", "forwardPE"]) ?? null,
    trailingPE: pickMetric(m, ["peTTM", "peBasicExclExtraTTM"]) ?? null,
    evToEbitda:
      pickMetric(m, ["evToEbitdaTTM", "ev/ebitdaAnnual", "enterpriseValueOverEBITDA"]) ?? null,
    priceToBook: pickMetric(m, ["pbAnnual", "priceToBookAnnual"]) ?? null,
    revenueGrowthPct: asPercent(
      pickMetric(m, ["revenueGrowthTTMYoy", "revenueGrowthQuarterlyYoy", "revenueGrowth3Y", "revenueGrowth5Y"]),
    ),
    earningsGrowthPct: asPercent(
      pickMetric(m, ["epsGrowthTTMYoy", "epsGrowthQuarterlyYoy", "epsGrowth3Y", "epsGrowth5Y", "netIncomeGrowth5Y"]),
    ),
    operatingMarginPct: asPercent(
      pickMetric(m, ["operatingMarginTTM", "operatingMarginAnnual", "operatingMargin5Y"]),
    ),
    grossMarginPct: asPercent(pickMetric(m, ["grossMarginTTM", "grossMarginAnnual", "grossMargin5Y"])),
    returnOnEquityPct: asPercent(pickMetric(m, ["roeTTM", "roeRfy", "roe5Y"])),
    freeCashFlowB: scaleMillionsToBillions(pickMetric(m, ["freeCashFlowAnnual", "freeCashFlowTTM"])),
    debtToEquity:
      pickMetric(m, ["totalDebt/totalEquityAnnual", "totalDebt/totalEquityQuarterly", "debtToEquityAnnual"]) ?? null,
    beta: pickMetric(m, ["beta"]) ?? null,
  };
}

function pickMetric(
  metric: Record<string, number | string | null | undefined>,
  keys: string[],
): number | null {
  for (const k of keys) {
    const v = metric[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

function asPercent(value: number | null): number | null {
  if (value == null) return null;
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function scaleMillionsToBillions(value: number | null): number | null {
  if (value == null) return null;
  return value / 1000;
}