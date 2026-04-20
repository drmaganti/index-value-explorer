import { Link } from "@tanstack/react-router";
import { LineChart } from "lucide-react";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/analyze", label: "Analyze" },
  { to: "/results", label: "Sample Report" },
  { to: "/methodology", label: "Methodology" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="page-container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3 md:flex-nowrap md:py-0">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-soft transition-transform group-hover:scale-105">
            <LineChart className="h-4.5 w-4.5" strokeWidth={2.25} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight">Index Value Agent</span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Quality · Value · Pullback
            </span>
          </div>
        </Link>

        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto pb-1 md:order-2 md:w-auto md:justify-center md:overflow-visible md:pb-0" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[status=active]:bg-muted data-[status=active]:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="order-2 flex items-center gap-2 md:order-3">
          <Link
            to="/analyze"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
          >
            Analyze Index
          </Link>
        </div>
      </div>
    </header>
  );
}
