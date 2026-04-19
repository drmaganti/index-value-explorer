import { Link } from "@tanstack/react-router";
import { ArrowRight, FileText } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 grid-bg opacity-[0.4] pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Long-horizon · Quality + Value screening
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Find <span className="text-primary">blue-chip value</span> opportunities
            hiding inside major indexes.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg text-pretty">
            Analyze an index like QQQ or SPY, detect high-quality stocks on recent
            pullback, and get a ranked top 10 report tuned for a 2+ year investment lens.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/analyze"
              className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-elevated transition-all hover:bg-primary/90 sm:w-auto"
            >
              Analyze Index
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/results"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface-elevated px-6 text-sm font-medium text-foreground shadow-soft transition-colors hover:bg-muted sm:w-auto"
            >
              <FileText className="h-4 w-4" />
              See Sample Report
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
