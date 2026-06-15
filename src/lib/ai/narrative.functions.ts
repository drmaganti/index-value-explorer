import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const rankedStockInputSchema = z.object({
  rank: z.number(),
  ticker: z.string(),
  name: z.string(),
  sector: z.string().optional().default(""),
  score: z.number(),
  pullbackPct: z.number(),
  marketCapB: z.number().optional(),
  forwardPE: z.number().optional(),
  trailingPE: z.number().optional(),
  evToEbitda: z.number().optional(),
  operatingMarginPct: z.number().optional(),
  revenueGrowthPct: z.number().optional(),
  earningsGrowthPct: z.number().optional(),
  freeCashFlowB: z.number().optional(),
  debtToEquity: z.number().optional(),
  returnOnEquityPct: z.number().optional(),
  above200dma: z.boolean().optional(),
});

const narrativeRequestSchema = z.object({
  universeName: z.string(),
  symbol: z.string(),
  mode: z.string(),
  passedCount: z.number(),
  rejectedCount: z.number(),
  constituentsScanned: z.number(),
  ranked: z.array(rankedStockInputSchema).max(15),
});

export type AnalysisNarrative = {
  summary: string;
  theses: Record<string, string>;
};

export const generateAnalysisNarrative = createServerFn({ method: "POST" })
  .inputValidator(narrativeRequestSchema)
  .handler(async ({ data }): Promise<AnalysisNarrative> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY is not configured.");
    }
    if (data.ranked.length === 0) {
      return { summary: "No stocks cleared the filters, so no thesis was generated.", theses: {} };
    }

    const fmt = (n: number | undefined, suffix = "") =>
      n == null || !Number.isFinite(n) ? "n/a" : `${Number(n.toFixed(2))}${suffix}`;

    const tickerLines = data.ranked
      .map((s) => {
        return `${s.rank}. ${s.ticker} (${s.name}, ${s.sector || "n/a"}) — score ${fmt(s.score)}, pullback ${fmt(s.pullbackPct, "%")}, mcap ${fmt(s.marketCapB, "B")}, fwdPE ${fmt(s.forwardPE)}, EV/EBITDA ${fmt(s.evToEbitda)}, opMargin ${fmt(s.operatingMarginPct, "%")}, revGrowth ${fmt(s.revenueGrowthPct, "%")}, FCF ${fmt(s.freeCashFlowB, "B")}, D/E ${fmt(s.debtToEquity)}, ROE ${fmt(s.returnOnEquityPct, "%")}, above200dma ${s.above200dma ?? "n/a"}`;
      })
      .join("\n");

    const systemPrompt = `You are an equity analyst writing concise, neutral commentary for a value-screening report. You only describe what the metrics show; you never give buy/sell recommendations or price targets. Respond ONLY with valid JSON matching the requested schema, no markdown fences.`;

    const userPrompt = `Universe: ${data.universeName} (${data.symbol}). Mode: ${data.mode}. ${data.passedCount} of ${data.constituentsScanned} names passed; ${data.rejectedCount} rejected.

Top ranked candidates:
${tickerLines}

Return JSON with this exact shape:
{
  "summary": "2-3 sentence overview of what the screen surfaced (themes, common factors, notable cautions). Plain text, <= 400 chars.",
  "theses": {
    "<TICKER>": "1-2 sentence thesis grounded in that name's metrics (pullback, valuation, profitability, growth). <= 240 chars. No advice."
  }
}
Include a thesis for every ticker listed above, keyed by ticker symbol exactly as given.`;

    let response: Response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
    } catch (err) {
      console.error("AI gateway request failed:", err);
      throw new Error("AI narrative service is unavailable.");
    }

    if (response.status === 429) {
      throw new Error("AI rate limit reached. Try again in a moment.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Add credits in workspace settings.");
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("AI gateway error", response.status, text);
      throw new Error("AI narrative generation failed.");
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content ?? "";

    let parsed: { summary?: unknown; theses?: unknown };
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("AI returned non-JSON:", content.slice(0, 200));
      throw new Error("AI returned malformed response.");
    }

    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const rawTheses =
      parsed.theses && typeof parsed.theses === "object"
        ? (parsed.theses as Record<string, unknown>)
        : {};
    const theses: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawTheses)) {
      if (typeof v === "string" && v.trim()) {
        theses[k.toUpperCase()] = v.trim();
      }
    }

    return { summary, theses };
  });