import type { RankedCandidate } from "@/lib/analysis/types";

interface Props {
  stock?: RankedCandidate;
}

export function StockDetailPlaceholder({ stock }: Props) {
  if (!stock) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface p-8 text-center">
        <p className="text-sm font-medium">Select a stock</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Click any row in the ranked table to see fundamentals & rationale.
        </p>
      </div>
    );
  }

  const valuationMetrics = [
    { label: "Current price", value: formatPrice(stock.currentPrice) },
    { label: "Forward P/E", value: formatMultiple(stock.forwardPE) },
    { label: "Trailing P/E", value: formatMultiple(stock.trailingPE) },
    { label: "EV / EBITDA", value: formatMultiple(stock.evToEbitda) },
    { label: "Price / book", value: formatMultiple(stock.priceToBook) },
    { label: "Market cap", value: formatBillions(stock.marketCapB) },
  ];

  const operatingMetrics = [
    { label: "52-week high", value: formatPrice(stock.high52Week) },
    { label: "52-week low", value: formatPrice(stock.low52Week) },
    { label: "Drawdown", value: formatPercent(stock.pullbackPct) },
    { label: "Revenue growth", value: formatPercent(stock.revenueGrowthPct) },
    { label: "Earnings growth", value: formatPercent(stock.earningsGrowthPct) },
    { label: "Operating margin", value: formatPercent(stock.operatingMarginPct) },
    { label: "Gross margin", value: formatPercent(stock.grossMarginPct) },
    { label: "ROE", value: formatPercent(stock.returnOnEquityPct) },
    { label: "Free cash flow", value: formatBillions(stock.freeCashFlowB) },
    { label: "Debt / equity", value: formatRatio(stock.debtToEquity) },
    { label: "Beta", value: formatRatio(stock.beta) },
    { label: "Above 200-DMA", value: stock.above200dma ? "Yes" : "No" },
  ];

  const watchItems = [
    stock.forwardPE != null ? `Forward P/E at ${stock.forwardPE.toFixed(1)}x still needs earnings delivery.` : null,
    stock.pullbackPct < -25 ? "Deeper drawdown raises execution sensitivity if sentiment weakens." : "Pullback is meaningful but not distressed.",
    stock.beta != null && stock.beta > 1.3 ? `Beta of ${stock.beta.toFixed(2)} implies above-index volatility.` : "Volatility profile looks manageable versus the index.",
  ].filter(Boolean);

  const risks = [
    stock.debtToEquity != null && stock.debtToEquity > 1.5
      ? `Leverage at ${stock.debtToEquity.toFixed(2)}x is elevated.`
      : "Balance-sheet leverage remains within a normal range.",
    stock.operatingMarginPct != null && stock.operatingMarginPct < 15
      ? "Margin profile leaves less room if growth slows."
      : "Margin structure provides some downside cushion.",
  ];
  const missingCount = stock.missingDataCount;

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            #{stock.rank.toString().padStart(2, "0")} · {stock.sector}
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">{stock.ticker}</p>
          <p className="text-sm text-muted-foreground">{stock.name}</p>
        </div>
        <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 font-mono text-xs font-medium text-primary">
          Score {stock.score}
        </span>
      </div>
      {stock.hasPartialData ? (
        <div className="mt-4 rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
          Partial data: {missingCount} fields unavailable in this snapshot. Ranking was preserved with the metrics on hand.
        </div>
      ) : null}

      <div className="mt-5 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {valuationMetrics.map((m) => (
              <div key={m.label} className="rounded-md border border-border bg-surface px-3 py-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
                <p className="mt-0.5 font-mono text-sm font-medium">{m.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {operatingMetrics.map((m) => (
              <div key={m.label} className="rounded-md border border-border bg-surface px-3 py-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
                <p className="mt-0.5 font-mono text-sm font-medium">{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Price path
          </p>
          <div className="mt-3 h-32 rounded-md border border-border/60 bg-surface-elevated p-3">
            <svg viewBox="0 0 240 88" className="h-full w-full" aria-hidden="true">
              <path
                d="M4 68 C26 64, 40 58, 58 54 S90 44, 110 48 S150 28, 174 34 S208 16, 236 22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary"
              />
              <path
                d="M4 76 H236"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-border"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Why this stock made the list
          </p>
          <ul className="mt-3 space-y-2 text-sm text-foreground">
            {stock.passReasons.map((reason) => (
              <li key={reason} className="leading-relaxed">{reason}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            What to watch
          </p>
          <ul className="mt-3 space-y-2 text-sm text-foreground">
            {watchItems.map((item) => (
              <li key={item} className="leading-relaxed">{item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Potential risks
          </p>
          <ul className="mt-3 space-y-2 text-sm text-foreground">
            {risks.map((item) => (
              <li key={item} className="leading-relaxed">{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function formatPrice(value?: number): string {
  return value == null ? "Data unavailable" : `$${value.toFixed(value >= 100 ? 0 : 2)}`;
}

function formatMultiple(value?: number): string {
  return value == null ? "Data unavailable" : `${value.toFixed(1)}x`;
}

function formatPercent(value?: number): string {
  return value == null ? "Data unavailable" : `${value.toFixed(1)}%`;
}

function formatBillions(value?: number): string {
  return value == null ? "Data unavailable" : `$${value.toFixed(1)}B`;
}

function formatRatio(value?: number): string {
  return value == null ? "Data unavailable" : value.toFixed(2);
}
