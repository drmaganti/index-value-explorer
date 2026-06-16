export interface SupportedIndex {
  symbol: "SPY" | "QQQ" | "DIA";
  display_name: string;
  index_name: string;
  description: string;
  is_active: boolean;
}

export const supportedIndexes: SupportedIndex[] = [
  {
    symbol: "SPY",
    display_name: "S&P 500 (SPY)",
    index_name: "S&P 500",
    description: "Broad large-cap US equities proxy (SPY ETF).",
    is_active: true,
  },
  {
    symbol: "QQQ",
    display_name: "Nasdaq 100 (QQQ)",
    index_name: "Nasdaq 100",
    description: "Large-cap US tech-tilted proxy (QQQ ETF).",
    is_active: true,
  },
  {
    symbol: "DIA",
    display_name: "Dow Jones (DIA)",
    index_name: "Dow Jones Industrial Average",
    description: "30 large US blue-chip proxy (DIA ETF).",
    is_active: true,
  },
];

export const SUPPORTED_INDEX_SYMBOLS = supportedIndexes
  .filter((i) => i.is_active)
  .map((i) => i.symbol);