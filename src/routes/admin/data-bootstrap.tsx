import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  bootstrapInitialMarketData,
  triggerRefreshConstituents,
  triggerCreateBootstrapQueue,
  processBootstrapTickerQueue,
  retryFailedTickers,
  refreshDailyPrices,
  getBootstrapStatus,
} from "@/lib/admin/bootstrap.functions";

export const Route = createFileRoute("/admin/data-bootstrap")({
  component: AdminBootstrapPage,
});

function AdminBootstrapPage() {
  const [adminSecret, setAdminSecret] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const fetchStatus = useServerFn(getBootstrapStatus);
  const runBootstrap = useServerFn(bootstrapInitialMarketData);
  const runRefreshC = useServerFn(triggerRefreshConstituents);
  const runCreateQueue = useServerFn(triggerCreateBootstrapQueue);
  const runProcessQueue = useServerFn(processBootstrapTickerQueue);
  const runRetryFailed = useServerFn(retryFailedTickers);
  const runDailyPrices = useServerFn(refreshDailyPrices);

  async function loadStatus() {
    setError(null);
    try {
      const s = await fetchStatus({ data: { adminSecret } });
      setStatus(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    loadStatus().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function withBusy(label: string, fn: () => Promise<any>) {
    setBusy(label);
    setError(null);
    try {
      const r = await fn();
      setLastResult({ label, r });
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page-container py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Data bootstrap</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Admin-only controls for seeding and refreshing index constituents and end-of-day stock snapshots.
        </p>
      </header>

      <Card className="p-4 space-y-3">
        <label className="text-sm font-medium">Admin secret</label>
        <Input
          type="password"
          value={adminSecret}
          onChange={(e) => setAdminSecret(e.target.value)}
          placeholder="Leave empty in dev. Required when ADMIN_BOOTSTRAP_SECRET is set."
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadStatus}>Reload status</Button>
        </div>
      </Card>

      {error && (
        <Card className="p-4 border-destructive">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      <Card className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Supported indexes" value={status?.supportedIndexes?.length ?? "—"} />
        <Stat label="Active constituents" value={status?.activeConstituents ?? "—"} />
        <Stat label="Unique tickers" value={status?.uniqueTickers ?? "—"} />
        <Stat label="Latest trade_date" value={status?.latestTradeDate ?? "—"} />
        <Stat label="Avg data completeness" value={status?.avgCompletenessPct != null ? `${status.avgCompletenessPct}%` : "—"} />
        <Stat
          label="Last bootstrap"
          value={
            status?.lastBootstrap?.completed_at
              ? new Date(status.lastBootstrap.completed_at).toLocaleString()
              : "Never"
          }
        />
        <Stat
          label="Last job"
          value={
            status?.lastBootstrap?.job_name
              ? `${status.lastBootstrap.job_name} (${status.lastBootstrap.status})`
              : "—"
          }
        />
        <Stat label="Failed records" value={status?.lastBootstrap?.records_failed ?? "—"} />
      </Card>

      {status?.queue && (
        <Card className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Queue pending" value={status.queue.pending} />
          <Stat label="Queue in progress" value={status.queue.inProgress} />
          <Stat label="Queue completed" value={status.queue.completed} />
          <Stat label="Queue failed" value={status.queue.failed} />
        </Card>
      )}

      {status?.indexCounts && (
        <Card className="p-4">
          <p className="text-sm font-medium mb-2">Constituents per index</p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(status.indexCounts).map(([sym, n]) => (
              <Badge key={sym} variant="secondary">{sym}: {String(n)}</Badge>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4 space-y-2">
        <p className="text-sm font-medium">Actions</p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!!busy}
            onClick={() => withBusy("bootstrap", () => runBootstrap({ data: { adminSecret } }))}
          >
            {busy === "bootstrap" ? "Running…" : "Run initial bootstrap (constituents + queue)"}
          </Button>
          <Button
            variant="secondary"
            disabled={!!busy}
            onClick={() => withBusy("constituents", () => runRefreshC({ data: { adminSecret } }))}
          >
            {busy === "constituents" ? "Running…" : "Run constituents refresh"}
          </Button>
          <Button
            variant="secondary"
            disabled={!!busy}
            onClick={() => withBusy("queue", () => runCreateQueue({ data: { adminSecret } }))}
          >
            {busy === "queue" ? "Running…" : "Create bootstrap queue"}
          </Button>
          <Button
            disabled={!!busy}
            onClick={() => withBusy("process", () => runProcessQueue({ data: { adminSecret } }))}
          >
            {busy === "process" ? "Running…" : "Process next 10 tickers"}
          </Button>
          <Button
            variant="secondary"
            disabled={!!busy}
            onClick={() => withBusy("retry", () => runRetryFailed({ data: { adminSecret } }))}
          >
            {busy === "retry" ? "Running…" : "Retry failed tickers"}
          </Button>
          <Button
            variant="outline"
            disabled={!!busy}
            onClick={() => withBusy("daily", () => runDailyPrices({ data: { adminSecret } }))}
          >
            {busy === "daily" ? "Running…" : "Refresh daily prices (no fundamentals)"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          End-of-day snapshots only. Free-tier safe: bootstrap processes 10 tickers per click, throttled to ~40 Finnhub calls/minute. Click "Process next 10 tickers" repeatedly until pending reaches zero.
        </p>
      </Card>

      {status?.recentFailures && status.recentFailures.length > 0 && (
        <Card className="p-4 space-y-2">
          <p className="text-sm font-medium">Recent failures</p>
          <div className="space-y-1 text-xs">
            {status.recentFailures.map((f: any) => (
              <div key={f.ticker} className="flex gap-2">
                <Badge variant="destructive">{f.ticker}</Badge>
                <span className="text-muted-foreground">attempts: {f.attempts}</span>
                <span className="truncate text-muted-foreground">{f.last_error?.slice(0, 200)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {lastResult && (
        <Card className="p-4">
          <p className="text-sm font-medium mb-2">Last run: {lastResult.label}</p>
          <pre className="text-xs overflow-auto max-h-96 bg-muted p-2 rounded">
            {JSON.stringify(lastResult.r, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold mt-1">{String(value)}</p>
    </div>
  );
}