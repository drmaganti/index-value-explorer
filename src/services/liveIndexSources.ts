import type { IndexConstituent } from "./types";

interface WikipediaParseResponse {
  parse?: {
    text?: string;
  };
  error?: {
    info?: string;
  };
}

const WIKIPEDIA_PAGE_BY_SYMBOL: Partial<Record<string, string>> = {
  QQQ: "Nasdaq-100",
  SPY: "List_of_S&P_500_companies",
  DIA: "Dow_Jones_Industrial_Average",
  NIFTY: "NIFTY_50",
  SENSEX: "BSE_SENSEX",
};

export async function fetchLiveIndexConstituents(
  symbol: string,
  fetchImpl: typeof fetch,
): Promise<IndexConstituent[] | null> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const pageTitle = WIKIPEDIA_PAGE_BY_SYMBOL[normalizedSymbol];

  if (!pageTitle) {
    return null;
  }

  const html = await fetchWikipediaPageHtml(pageTitle, fetchImpl);

  switch (normalizedSymbol) {
    case "QQQ":
      return parseNasdaq100Constituents(html);
    case "SPY":
      return parseSp500Constituents(html);
    case "DIA":
      return parseDowComponents(html);
    case "NIFTY":
      return parseNifty50Constituents(html);
    case "SENSEX":
      return parseSensexConstituents(html);
    default:
      return null;
  }
}

async function fetchWikipediaPageHtml(
  pageTitle: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const response = await fetchImpl(
    `https://en.wikipedia.org/w/api.php?action=parse&prop=text&format=json&formatversion=2&redirects=1&page=${encodeURIComponent(pageTitle)}`,
    {
      headers: {
        accept: "application/json",
        "user-agent": "Index Value Agent/1.0 (contact: Lovable Cloud)",
        "api-user-agent": "Index Value Agent/1.0 (Lovable Cloud)",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Provider failure while loading index constituents (${response.status}).`);
  }

  const payload = (await response.json()) as WikipediaParseResponse;
  const html = payload.parse?.text;

  if (!html) {
    throw new Error(payload.error?.info || "Provider failure while loading index constituents.");
  }

  return html;
}

function parseSp500Constituents(html: string): IndexConstituent[] {
  const table = extractTableByNeedle(html, 'id="constituents"');
  const constituents = extractTableRows(table)
    .map(extractCells)
    .filter((cells) => cells.length >= 3)
    .map((cells) => ({
      ticker: extractText(cells[0]),
      name: extractText(cells[1]),
      sector: extractText(cells[2]) || "Unknown",
    }))
    .filter((entry) => entry.ticker && entry.ticker !== "Symbol");

  if (constituents.length === 0) {
    throw new Error("No constituents were available for SPY.");
  }

  return constituents;
}

function parseNasdaq100Constituents(html: string): IndexConstituent[] {
  const table = extractTableByNeedle(html, 'id="Current_components"');
  const constituents = extractTableRows(table)
    .map(extractCells)
    .filter((cells) => cells.length >= 3)
    .map((cells) => ({
      ticker: extractText(cells[0]),
      name: extractText(cells[1]),
      sector: extractText(cells[2]) || "Unknown",
    }))
    .filter((entry) => entry.ticker && entry.ticker !== "Ticker");

  if (constituents.length === 0) {
    throw new Error("No constituents were available for QQQ.");
  }

  return constituents;
}

function parseDowComponents(html: string): IndexConstituent[] {
  const table = extractTableByNeedle(html, 'id="Components"');
  const constituents = extractTableRows(table)
    .map(extractCells)
    .filter((cells) => cells.length >= 7)
    .map((cells) => ({
      name: extractText(cells[0]),
      ticker: extractText(cells[2]),
      sector: extractText(cells[3]) || "Unknown",
      weight: parsePercent(extractText(cells[6])),
    }))
    .filter((entry) => entry.ticker && entry.ticker !== "Symbol");

  if (constituents.length === 0) {
    throw new Error("No constituents were available for DIA.");
  }

  return constituents;
}

/**
 * NIFTY 50 — table columns: Company name | Symbol (e.g. ADANIENT) |
 * Sector | Date added. We append `.NS` so Yahoo Finance can resolve the
 * symbol to the correct NSE India listing.
 */
function parseNifty50Constituents(html: string): IndexConstituent[] {
  // The page has both `id="Constituents"` (the H2 section heading) and
  // `id="constituents"` (on the <table> tag itself). Searching forward from
  // the lowercase needle lands AFTER the table's opening `<table` token, so
  // we'd skip past it and hit the next table ("List of replacements"). Use
  // the section heading anchor instead, which is guaranteed to come before
  // the table.
  const table = extractTableByNeedle(html, 'id="Constituents"');
  const constituents = extractTableRows(table)
    .map(extractCells)
    .filter((cells) => cells.length >= 3)
    .map((cells) => {
      const baseSymbol = extractText(cells[1]);
      return {
        name: extractText(cells[0]),
        ticker: baseSymbol ? `${baseSymbol}.NS` : "",
        sector: extractText(cells[2]) || "Unknown",
      };
    })
    .filter(
      (entry) =>
        entry.ticker &&
        // Header row leaks through as "Symbol.NS" — strip it. Also skip any
        // row whose symbol contains whitespace (can happen with malformed
        // markup where multiple cells collapse).
        !/^symbol\.ns$/i.test(entry.ticker) &&
        !/\s/.test(entry.ticker),
    );

  if (constituents.length === 0) {
    throw new Error("No constituents were available for NIFTY.");
  }

  return constituents;
}

/**
 * BSE SENSEX — table columns: Company | Symbol (already `.BO`) |
 * Ticker (BSE numeric code) | Industry | Entry date. The Symbol column
 * is already in Yahoo's `.BO` form, so we use it as-is.
 */
function parseSensexConstituents(html: string): IndexConstituent[] {
  // Use the H2 section anchor (`id="Constituents"`) instead of the table's
  // own lowercase `id="constituents"` — searching for the lowercase needle
  // lands inside the table tag and `indexOf("<table", ...)` then jumps to
  // the NEXT table ("Constituent removed" replacements list).
  const table = extractTableByNeedle(html, 'id="Constituents"');
  const constituents = extractTableRows(table)
    .map(extractCells)
    .filter((cells) => cells.length >= 4)
    .map((cells) => ({
      name: extractText(cells[0]),
      ticker: extractText(cells[1]).toUpperCase(),
      sector: extractText(cells[3]) || "Unknown",
    }))
    .filter(
      (entry) =>
        entry.ticker &&
        entry.ticker !== "SYMBOL" &&
        // Real rows look like ADANIPORTS.BO; header row would be "Symbol".
        entry.ticker.includes("."),
    );

  if (constituents.length === 0) {
    throw new Error("No constituents were available for SENSEX.");
  }

  return constituents;
}

function extractTableByNeedle(html: string, needle: string): string {
  const sectionStart = html.indexOf(needle);
  if (sectionStart === -1) {
    throw new Error("Provider failure while loading index constituents.");
  }

  const tableStart = html.indexOf("<table", sectionStart);
  const tableEnd = html.indexOf("</table>", tableStart);

  if (tableStart === -1 || tableEnd === -1) {
    throw new Error("Provider failure while loading index constituents.");
  }

  return html.slice(tableStart, tableEnd + "</table>".length);
}

function extractTableRows(tableHtml: string): string[] {
  return [...tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((match) => match[0]);
}

function extractCells(rowHtml: string): string[] {
  return [...rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
    (match) => match[1],
  );
}

function extractText(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function parsePercent(value: string): number | undefined {
  const numeric = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric / 100 : undefined;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCharCode(Number.parseInt(dec, 10)),
    );
}