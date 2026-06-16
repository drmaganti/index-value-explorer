import { Info } from "lucide-react";

export function Disclaimer() {
  return (
    <section className="rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed text-muted-foreground">
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="font-semibold text-foreground">Disclaimer.</span> This app uses end-of-day snapshots for long-term research. It is not designed for intraday trading. This report is for educational and research purposes only — it is not financial advice, an investment recommendation, or a solicitation to buy or sell securities. Market data may be delayed, incomplete, or inaccurate. Always do your own research and consult a qualified advisor before making investment decisions.
        </p>
      </div>
    </section>
  );
}