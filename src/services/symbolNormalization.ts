/**
 * Convert ticker symbols to the form Finnhub / Yahoo expect.
 *
 * - Share-class tickers from Wikipedia use a dot (BRK.B, BF.B). Both
 *   Finnhub and Yahoo want a dash (BRK-B), so we convert those.
 * - Yahoo exchange suffixes (`.NS` for NSE India, `.BO` for BSE India,
 *   `.L` for LSE, `.TO` for TSX, `.HK` for Hong Kong, etc.) are part of
 *   the lookup key on Yahoo and MUST be preserved.
 *
 * Heuristic: if the trailing token after the last dot is a known Yahoo
 * exchange suffix, normalize the rest and keep the suffix; otherwise
 * convert all dots to dashes.
 */
const YAHOO_EXCHANGE_SUFFIXES = new Set([
  "NS", // NSE (India)
  "BO", // BSE (India)
  "L",  // London
  "TO", // Toronto
  "V",  // TSX Venture
  "HK", // Hong Kong
  "T",  // Tokyo
  "AX", // ASX (Australia)
  "DE", // Deutsche Börse / XETRA
  "PA", // Euronext Paris
  "AS", // Euronext Amsterdam
  "MI", // Borsa Italiana
  "SW", // SIX Swiss
  "ST", // Stockholm
  "HE", // Helsinki
  "OL", // Oslo
  "MC", // Madrid
  "SA", // São Paulo
]);

export function normalizeTickerForProvider(ticker: string): string {
  const upper = ticker.trim().toUpperCase();
  const lastDot = upper.lastIndexOf(".");
  if (lastDot > 0) {
    const suffix = upper.slice(lastDot + 1);
    if (YAHOO_EXCHANGE_SUFFIXES.has(suffix)) {
      const base = upper.slice(0, lastDot).replace(/\./g, "-");
      return `${base}.${suffix}`;
    }
  }
  return upper.replace(/\./g, "-");
}

export function normalizeTickerList(tickers: string[]): string[] {
  return tickers.map(normalizeTickerForProvider);
}
