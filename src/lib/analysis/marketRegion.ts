/**
 * Market region helpers.
 *
 * The analysis engine treats `minMarketCapB` as "billions of the index's
 * native currency". For US indices that's USD; for Indian indices Yahoo
 * reports market cap in INR. Rather than convert currencies, we relabel
 * the input for Indian indices into the more familiar Crore (₹).
 *
 *   1 Crore (Cr)        = 10 million        = 0.01 billion
 *   1 Lakh Crore (LCr)  = 1 trillion        = 1,000 billion
 *
 * So a ₹50,000 Cr blue chip == 500 B INR == minMarketCapB of 500.
 */

const INDIAN_INDICES = new Set(["NIFTY", "SENSEX"]);

export type MarketRegion = "us" | "in";

export function getMarketRegion(symbol: string): MarketRegion {
  return INDIAN_INDICES.has(symbol.toUpperCase()) ? "in" : "us";
}

export function isIndianIndex(symbol: string): boolean {
  return getMarketRegion(symbol) === "in";
}

/** Convert internal billions-of-native-currency to display Crore (₹). */
export function billionsToCrore(b: number): number {
  return b * 100;
}

/** Convert display Crore (₹) back to internal billions. */
export function croreToBillions(cr: number): number {
  return cr / 100;
}

/**
 * Region-appropriate defaults for the market-cap floor.
 * Returned in *internal* units (billions of native currency).
 *
 * India blue-chip rule of thumb: ≥ ₹50,000 Cr (large cap as defined by SEBI
 * is roughly the top 100 by market cap, all of which sit well above this).
 */
export function defaultMarketCapBForRegion(
  region: MarketRegion,
  mode: "conservative" | "balanced" | "opportunistic",
): number {
  if (region === "in") {
    // Billions INR — conservative ₹1,00,000 Cr, balanced ₹50,000 Cr, opportunistic ₹20,000 Cr.
    if (mode === "conservative") return 1000;
    if (mode === "opportunistic") return 200;
    return 500;
  }
  if (mode === "conservative") return 50;
  if (mode === "opportunistic") return 10;
  return 25;
}

export const MARKET_CAP_LABELS = {
  us: { unit: "B USD", currencySymbol: "$" },
  in: { unit: "Cr ₹", currencySymbol: "₹" },
} as const;