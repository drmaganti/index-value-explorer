/**
 * Yahoo Finance daily candle fetcher.
 *
 * Uses the unauthenticated `v8/finance/chart` endpoint. Throttled to
 * 1 in-flight request with a ~1.2s spacing + jitter and exponential
 * backoff on 401/429 (Yahoo blocks bursty IPs aggressively but is very
 * tolerant of steady traffic). Browser-shaped User-Agent is mandatory —
 * Yahoo blocks the default fetch UA almost immediately.
 */

export interface DailyPriceSnapshot {
  closePrice: number | null;
  previousClose: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  twoHundredDayMovingAverage: number | null;
  drawdownFromHighPct: number | null;
  tradeDateISO: string | null;
}

interface ChartResult {
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      close?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
    }>;
    adjclose?: Array<{ adjclose?: Array<number | null> }>;
  };
  meta?: { regularMarketPrice?: number; chartPreviousClose?: number };
}

interface ChartResponse {
  chart?: {
    result?: ChartResult[] | null;
    error?: { code?: string; description?: string } | null;
  };
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const MIN_SPACING_MS = 1200;
const MAX_ATTEMPTS = 4;

let chain: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;
let cooldownUntil = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function runQueued<T>(fn: () => Promise<T>): Promise<T> {
  const prev = chain.catch(() => undefined);
  let release!: () => void;
  chain = new Promise<void>((r) => (release = r));
  await prev;
  try {
    const now = Date.now();
    const wait = Math.max(0, lastCallAt + MIN_SPACING_MS - now, cooldownUntil - now);
    if (wait > 0) await sleep(wait + Math.floor(Math.random() * 250));
    lastCallAt = Date.now();
    return await fn();
  } finally {
    release();
  }
}

async function fetchChart(
  ticker: string,
  fetchImpl: typeof fetch,
): Promise<ChartResponse> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?range=1y&interval=1d&includePrePost=false&events=div%2Csplit`;

  let attempt = 0;
  let lastErr: unknown = null;
  while (attempt < MAX_ATTEMPTS) {
    const res = await runQueued(() =>
      fetchImpl(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }),
    );
    if (res.status === 429 || res.status === 401 || res.status === 403) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(30_000, 2000 * 2 ** attempt + Math.random() * 500);
      cooldownUntil = Math.max(cooldownUntil, Date.now() + backoff);
      lastErr = new Error(`Yahoo HTTP ${res.status} (retry in ${Math.round(backoff / 1000)}s)`);
      attempt += 1;
      continue;
    }
    if (!res.ok) {
      throw new Error(`Yahoo HTTP ${res.status} for ${ticker}`);
    }
    return (await res.json()) as ChartResponse;
  }
  throw lastErr instanceof Error ? lastErr : new Error(`Yahoo failed for ${ticker}`);
}

export async function fetchDailyCandleSnapshot(
  ticker: string,
  _apiKeyUnused: string,
  fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args),
): Promise<DailyPriceSnapshot> {
  const payload = await fetchChart(ticker, fetchImpl);
  const result = payload.chart?.result?.[0];
  if (!result || payload.chart?.error) {
    return emptySnapshot();
  }

  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  const adjclose = result.indicators?.adjclose?.[0]?.adjclose;
  const closesRaw = (adjclose ?? quote?.close ?? []) as Array<number | null>;
  const highsRaw = (quote?.high ?? closesRaw) as Array<number | null>;
  const lowsRaw = (quote?.low ?? closesRaw) as Array<number | null>;

  // Strip null bars (Yahoo includes them for non-trading sessions).
  const cleaned: Array<{ t: number; c: number; h: number; l: number }> = [];
  for (let i = 0; i < closesRaw.length; i++) {
    const c = closesRaw[i];
    const h = highsRaw[i] ?? c;
    const l = lowsRaw[i] ?? c;
    const t = timestamps[i];
    if (typeof c === "number" && Number.isFinite(c) && typeof t === "number") {
      cleaned.push({ t, c, h: typeof h === "number" ? h : c, l: typeof l === "number" ? l : c });
    }
  }

  if (cleaned.length === 0) return emptySnapshot();

  const last = cleaned[cleaned.length - 1];
  const prev = cleaned.length > 1 ? cleaned[cleaned.length - 2] : null;

  const window52 = cleaned.slice(-252);
  const high52 = Math.max(...window52.map((d) => d.h));
  const low52 = Math.min(...window52.map((d) => d.l));

  const dmaSlice = cleaned.slice(-200).map((d) => d.c);
  const dma200 = dmaSlice.length >= 50
    ? dmaSlice.reduce((a, b) => a + b, 0) / dmaSlice.length
    : null;

  const drawdown = high52 > 0 ? ((last.c - high52) / high52) * 100 : null;

  return {
    closePrice: last.c,
    previousClose: prev?.c ?? result.meta?.chartPreviousClose ?? null,
    fiftyTwoWeekHigh: Number.isFinite(high52) ? high52 : null,
    fiftyTwoWeekLow: Number.isFinite(low52) ? low52 : null,
    twoHundredDayMovingAverage: dma200,
    drawdownFromHighPct: drawdown,
    tradeDateISO: new Date(last.t * 1000).toISOString().slice(0, 10),
  };
}

function emptySnapshot(): DailyPriceSnapshot {
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