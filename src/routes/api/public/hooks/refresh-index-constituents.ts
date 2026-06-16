import { createFileRoute } from "@tanstack/react-router";
import { FinnhubIndexProvider } from "@/services";
import { normalizeTickerForProvider } from "@/services/symbolNormalization";

const SUPPORTED_INDEXES = ["SPY", "QQQ", "DIA"] as const;

function isAuthorized(request: Request): boolean {
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!supabaseKey) return true; // dev: don't lock out
  const apikey = request.headers.get("apikey") ?? request.headers.get("x-apikey");
  return apikey === supabaseKey;
}

export const Route = createFileRoute("/api/public/hooks/refresh-index-constituents")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorized(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const apiKey = process.env.FINNHUB_API_KEY ?? "";
        const indexProvider = new FinnhubIndexProvider(apiKey);

        const startedAt = new Date().toISOString();
        const todayISO = startedAt.slice(0, 10);
        let processed = 0;
        let failed = 0;
        const perIndex: Record<string, { count: number; provider: string; error?: string }> = {};

        for (const symbol of SUPPORTED_INDEXES) {
          try {
            const constituents = await indexProvider.getConstituents(symbol);
            const provider =
              symbol === "SPY" || symbol === "QQQ" || symbol === "DIA"
                ? "wikipedia"
                : "finnhub";

            // Deactivate previous active rows for this index
            await supabaseAdmin
              .from("index_constituents")
              .update({ is_active: false })
              .eq("index_symbol", symbol)
              .eq("is_active", true);

            const rows = constituents
              .filter((c) => c.ticker && c.ticker.length > 0)
              .map((c) => ({
                index_symbol: symbol,
                ticker: normalizeTickerForProvider(c.ticker),
                company_name: c.name ?? null,
                sector: c.sector ?? null,
                weight: c.weight ?? null,
                provider,
                as_of_date: todayISO,
                is_active: true,
              }));

            // Upsert on (index_symbol, ticker, as_of_date)
            const { error } = await supabaseAdmin
              .from("index_constituents")
              .upsert(rows, { onConflict: "index_symbol,ticker,as_of_date" });

            if (error) throw error;
            processed += rows.length;
            perIndex[symbol] = { count: rows.length, provider };
          } catch (err) {
            failed += 1;
            perIndex[symbol] = {
              count: 0,
              provider: "n/a",
              error: err instanceof Error ? err.message : String(err),
            };
            console.error(`refreshIndexConstituents failed for ${symbol}:`, err);
          }
        }

        const status = failed === 0 ? "success" : processed > 0 ? "partial" : "error";
        await supabaseAdmin.from("refresh_job_logs").insert({
          job_name: "refreshIndexConstituents",
          status,
          started_at: startedAt,
          completed_at: new Date().toISOString(),
          records_processed: processed,
          records_failed: failed,
          metadata_json: perIndex,
        });

        return new Response(
          JSON.stringify({ status, processed, failed, perIndex }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
      GET: async () =>
        new Response("Use POST to trigger refresh.", { status: 405 }),
    },
  },
});