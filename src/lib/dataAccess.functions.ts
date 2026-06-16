/**
 * Client-callable wrappers around the cached-data layer.
 * These run on the server, read from public tables (RLS allows anon read),
 * and let the UI render freshness state without exposing query plumbing.
 */
import { createServerFn } from "@tanstack/react-start";

export interface DataFreshnessInfo {
  marketDataAsOf: string | null;
  constituentsAsOf: string | null;
  lastConstituentRefreshAt: string | null;
  lastSnapshotRefreshAt: string | null;
}

export const getDataFreshness = createServerFn({ method: "GET" })
  .inputValidator((data: { symbol: string }) => ({
    symbol: (data.symbol ?? "").trim().toUpperCase(),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [constituentRow, snapshotRow, constituentJob, snapshotJob] = await Promise.all([
      supabaseAdmin
        .from("index_constituents")
        .select("as_of_date")
        .eq("index_symbol", data.symbol)
        .eq("is_active", true)
        .order("as_of_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("stock_daily_snapshots")
        .select("trade_date")
        .order("trade_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("refresh_job_logs")
        .select("completed_at, status")
        .eq("job_name", "refreshIndexConstituents")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("refresh_job_logs")
        .select("completed_at, status")
        .eq("job_name", "refreshDailyStockSnapshots")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const result: DataFreshnessInfo = {
      marketDataAsOf: snapshotRow.data?.trade_date ?? null,
      constituentsAsOf: constituentRow.data?.as_of_date ?? null,
      lastConstituentRefreshAt: constituentJob.data?.completed_at ?? null,
      lastSnapshotRefreshAt: snapshotJob.data?.completed_at ?? null,
    };
    return result;
  });