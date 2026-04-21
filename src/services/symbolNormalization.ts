/**
 * Convert ticker symbols to the format Finnhub expects.
 *
 * Wikipedia and most financial press write share-class tickers with a dot
 * (BRK.B, BF.B, BRK.A). Finnhub's canonical form uses a dash (BRK-B).
 * Yahoo Finance also expects the dash form, so this single normalizer
 * works for both providers.
 */
export function normalizeTickerForProvider(ticker: string): string {
  return ticker.trim().toUpperCase().replace(/\./g, "-");
}

export function normalizeTickerList(tickers: string[]): string[] {
  return tickers.map(normalizeTickerForProvider);
}
