import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-surface">
      <div className="page-container py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="text-sm font-semibold tracking-tight">Index Value Agent</p>
            <p className="mt-3 max-w-md text-sm text-muted-foreground text-pretty">
              A focused screening workflow for identifying indexes or ETFs that may deserve a second look after a pullback.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Product
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/analyze" className="hover:text-foreground text-muted-foreground">Run analysis</Link></li>
              <li><Link to="/results" className="hover:text-foreground text-muted-foreground">Sample report</Link></li>
              <li><Link to="/methodology" className="hover:text-foreground text-muted-foreground">Methodology</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Legal
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Screening tool only</li>
              <li>For research, not recommendations</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Index Value Agent. Built for research and review.</p>
          <p className="font-mono">v0.1 · live data · long-horizon</p>
        </div>
      </div>
    </footer>
  );
}
