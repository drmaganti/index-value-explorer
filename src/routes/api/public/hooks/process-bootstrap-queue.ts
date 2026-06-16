import { createFileRoute } from "@tanstack/react-router";
import { serializeError } from "@/lib/admin/serializeError";

/**
 * Scheduled drip-processor for the bootstrap ticker queue.
 *
 * Designed to be called by pg_cron every ~10 minutes after the US market
 * close. Each invocation:
 *   1. Resets failed tickers (attempts >= 3) back to pending IF no pending
 *      work is left — this lets the queue self-heal across nights.
 *   2. Processes one small batch via the queue worker (size set in
 *      bootstrap.functions.ts; currently 5 tickers per run).
 *   3. Logs the run to refresh_job_logs.
 */
export const Route = createFileRoute("/api/public/hooks/process-bootstrap-queue")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (supabaseKey) {
          const apikey = request.headers.get("apikey") ?? request.headers.get("x-apikey");
          if (apikey !== supabaseKey) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        const startedAt = new Date().toISOString();
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // If no pending work but failed exist, reset them to pending so the
          // next batch picks them up. Cap attempts so we don't loop forever
          // on truly bad tickers.
          const [{ count: pendingCount }, { count: failedCount }] = await Promise.all([
            supabaseAdmin
              .from("bootstrap_ticker_queue")
              .select("*", { count: "exact", head: true })
              .eq("status", "pending"),
            supabaseAdmin
              .from("bootstrap_ticker_queue")
              .select("*", { count: "exact", head: true })
              .eq("status", "failed"),
          ]);

          if ((pendingCount ?? 0) === 0 && (failedCount ?? 0) > 0) {
            await supabaseAdmin
              .from("bootstrap_ticker_queue")
              .update({ status: "pending", attempts: 0, last_error: null, next_retry_at: null })
              .eq("status", "failed");
          }

          const { processBootstrapTickerQueue } = await import("@/lib/admin/bootstrap.functions");
          const result = await processBootstrapTickerQueue({ data: {} });

          return new Response(
            JSON.stringify({ ok: true, startedAt, ...result }),
            { headers: { "Content-Type": "application/json" } },
          );
        } catch (err) {
          const msg = serializeError(err);
          console.error("process-bootstrap-queue cron failed:", msg);
          return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      GET: async () => new Response("Use POST.", { status: 405 }),
    },
  },
});