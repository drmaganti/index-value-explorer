import type { IndexConstituent } from "./types";

/**
 * Index provider — returns the constituents for a given index symbol.
 *
 * This is the seam where a real provider (e.g. an ETF holdings API) will
 * plug in. The engine never calls a network directly; it depends only on
 * the IndexProvider interface.
 */
export interface IndexProvider {
  getConstituents(symbol: string): Promise<IndexConstituent[]>;
}

interface FinnhubEtfHoldingsResponse {
  holdings?: Array<{
    symbol?: string;
    name?: string;
    weight?: number;
  }>;
}

export class FinnhubIndexProvider implements IndexProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async getConstituents(symbol: string): Promise<IndexConstituent[]> {
    const normalizedSymbol = symbol.trim().toUpperCase();
    const response = await this.fetchImpl(
      `https://finnhub.io/api/v1/etfs/holdings?symbol=${encodeURIComponent(normalizedSymbol)}&token=${encodeURIComponent(this.apiKey)}`,
    );

    if (!response.ok) {
      throw new Error(`Provider failure while loading ETF holdings (${response.status}).`);
    }

    const payload = (await response.json()) as FinnhubEtfHoldingsResponse;
    const constituents = (payload.holdings ?? [])
      .map((holding) => ({
        ticker: holding.symbol?.trim().toUpperCase() ?? "",
        name: holding.name?.trim() || holding.symbol?.trim().toUpperCase() || "Unknown company",
        sector: "Unknown",
        weight:
          typeof holding.weight === "number"
            ? holding.weight > 1
              ? holding.weight / 100
              : holding.weight
            : undefined,
      }))
      .filter((holding) => holding.ticker.length > 0);

    if (constituents.length === 0) {
      throw new Error(`No constituents were available for ${normalizedSymbol}.`);
    }

    return constituents;
  }
}

/* ------------------------------------------------------------------ */
/* Mock implementation — covers the supported indexes for the demo.   */
/* ------------------------------------------------------------------ */

const MOCK_CONSTITUENTS: Record<string, IndexConstituent[]> = {
  QQQ: [
    { ticker: "ADBE",  name: "Adobe Inc.",                sector: "Software" },
    { ticker: "GOOGL", name: "Alphabet Inc.",             sector: "Communication" },
    { ticker: "AMD",   name: "Advanced Micro Devices",    sector: "Semiconductors" },
    { ticker: "PEP",   name: "PepsiCo Inc.",              sector: "Consumer Staples" },
    { ticker: "TXN",   name: "Texas Instruments",         sector: "Semiconductors" },
    { ticker: "INTU",  name: "Intuit Inc.",               sector: "Software" },
    { ticker: "QCOM",  name: "Qualcomm Inc.",             sector: "Semiconductors" },
    { ticker: "MDLZ",  name: "Mondelez International",    sector: "Consumer Staples" },
    { ticker: "BKNG",  name: "Booking Holdings",          sector: "Travel" },
    { ticker: "AMAT",  name: "Applied Materials",         sector: "Semiconductors" },
    { ticker: "CSCO",  name: "Cisco Systems",             sector: "Networking" },
    { ticker: "AMGN",  name: "Amgen Inc.",                sector: "Biotech" },
    { ticker: "TSLA",  name: "Tesla Inc.",                sector: "Auto" },
    { ticker: "NFLX",  name: "Netflix Inc.",              sector: "Communication" },
    { ticker: "MRNA",  name: "Moderna Inc.",              sector: "Biotech" },
    { ticker: "PYPL",  name: "PayPal Holdings",           sector: "Financials" },
    { ticker: "WBD",   name: "Warner Bros. Discovery",    sector: "Communication" },
    { ticker: "MSFT",  name: "Microsoft Corp.",           sector: "Software" },
  ],
  SPY: [
    { ticker: "GOOGL", name: "Alphabet Inc.",             sector: "Communication" },
    { ticker: "PEP",   name: "PepsiCo Inc.",              sector: "Consumer Staples" },
    { ticker: "MDLZ",  name: "Mondelez International",    sector: "Consumer Staples" },
    { ticker: "ADBE",  name: "Adobe Inc.",                sector: "Software" },
    { ticker: "AMGN",  name: "Amgen Inc.",                sector: "Biotech" },
    { ticker: "MSFT",  name: "Microsoft Corp.",           sector: "Software" },
    { ticker: "CSCO",  name: "Cisco Systems",             sector: "Networking" },
    { ticker: "QCOM",  name: "Qualcomm Inc.",             sector: "Semiconductors" },
    { ticker: "BKNG",  name: "Booking Holdings",          sector: "Travel" },
    { ticker: "PYPL",  name: "PayPal Holdings",           sector: "Financials" },
  ],
  DIA: [
    { ticker: "MSFT",  name: "Microsoft Corp.",           sector: "Software" },
    { ticker: "CSCO",  name: "Cisco Systems",             sector: "Networking" },
    { ticker: "AMGN",  name: "Amgen Inc.",                sector: "Biotech" },
    { ticker: "MDLZ",  name: "Mondelez International",    sector: "Consumer Staples" },
  ],
};

export class MockIndexProvider implements IndexProvider {
  async getConstituents(symbol: string): Promise<IndexConstituent[]> {
    const list = MOCK_CONSTITUENTS[symbol.toUpperCase()];
    if (!list) {
      throw new Error(`Unsupported index symbol: ${symbol}`);
    }
    return [...list];
  }
}

export const mockIndexProvider = new MockIndexProvider();
