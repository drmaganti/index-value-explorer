/**
 * Module-level token-bucket throttler for Finnhub free tier.
 *
 * - Caps outbound calls at 40/min (well under the 60/min free-tier limit
 *   so other code paths can borrow headroom).
 * - Caps concurrency to 2 so a burst of 10 ticker fetches doesn't shred
 *   the limit in 100ms.
 * - Retries 429s with exponential backoff and respects Retry-After.
 */

const MAX_CALLS_PER_WINDOW = 40;
const WINDOW_MS = 60_000;
const MAX_CONCURRENCY = 2;

const callTimestamps: number[] = [];
let activeCalls = 0;
const waiters: Array<() => void> = [];
let cooldownUntil = 0;

function pruneWindow(now: number): void {
  while (callTimestamps.length > 0 && now - callTimestamps[0] > WINDOW_MS) {
    callTimestamps.shift();
  }
}

async function acquireSlot(): Promise<void> {
  while (true) {
    const now = Date.now();
    pruneWindow(now);

    if (now < cooldownUntil) {
      await sleep(cooldownUntil - now);
      continue;
    }

    if (activeCalls < MAX_CONCURRENCY && callTimestamps.length < MAX_CALLS_PER_WINDOW) {
      activeCalls += 1;
      callTimestamps.push(now);
      return;
    }

    if (callTimestamps.length >= MAX_CALLS_PER_WINDOW) {
      const waitMs = WINDOW_MS - (now - callTimestamps[0]) + 50;
      await sleep(Math.max(waitMs, 250));
      continue;
    }

    // Concurrency limited — wait for a release.
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
}

function releaseSlot(): void {
  activeCalls = Math.max(0, activeCalls - 1);
  const next = waiters.shift();
  if (next) next();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class FinnhubRateLimitError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super(`Finnhub rate limited (retry in ${Math.round(retryAfterMs / 1000)}s)`);
    this.name = "FinnhubRateLimitError";
  }
}

/**
 * Run a Finnhub request inside the throttler with up to 3 retries on 429.
 * The function passed in MUST issue exactly one HTTP call.
 */
export async function withFinnhubLimit<T>(
  fn: () => Promise<Response>,
  parse: (res: Response) => Promise<T>,
): Promise<T> {
  const MAX_ATTEMPTS = 3;
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < MAX_ATTEMPTS) {
    await acquireSlot();
    try {
      const res = await fn();
      if (res.status === 429) {
        const retryAfterHeader = res.headers.get("retry-after");
        const retryAfterSec = retryAfterHeader ? Number(retryAfterHeader) : NaN;
        const backoffMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0
          ? retryAfterSec * 1000
          : Math.min(30_000, 1000 * 2 ** attempt + Math.random() * 500);
        cooldownUntil = Math.max(cooldownUntil, Date.now() + backoffMs);
        attempt += 1;
        lastError = new FinnhubRateLimitError(backoffMs);
        continue;
      }
      if (!res.ok) {
        throw new Error(`Finnhub HTTP ${res.status}`);
      }
      return await parse(res);
    } finally {
      releaseSlot();
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Finnhub request failed after retries");
}