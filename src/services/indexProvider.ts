import type { IndexConstituent } from "./types";
import { fetchLiveIndexConstituents } from "./liveIndexSources";

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
    private readonly fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args),
  ) {}

  async getConstituents(symbol: string): Promise<IndexConstituent[]> {
    const normalizedSymbol = symbol.trim().toUpperCase();

    const liveIndexConstituents = await fetchLiveIndexConstituents(
      normalizedSymbol,
      this.fetchImpl,
    );
    if (liveIndexConstituents) {
      return liveIndexConstituents;
    }

    const response = await this.fetchImpl(
      `https://finnhub.io/api/v1/etf/holdings?symbol=${encodeURIComponent(normalizedSymbol)}&token=${encodeURIComponent(this.apiKey)}`,
    );

    if (!response.ok) {
      throw new Error(`Provider failure while loading ETF holdings (${response.status}).`);
    }

    const payload = await parseJsonResponse<FinnhubEtfHoldingsResponse>(response, "ETF holdings");
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

async function parseJsonResponse<T>(response: Response, label: string): Promise<T> {
  const text = await response.text();
  const trimmed = text.trim();

  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    throw new Error(`Provider failure while loading ${label}.`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Provider failure while loading ${label}.`);
  }
}

