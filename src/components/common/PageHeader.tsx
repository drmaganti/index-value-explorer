import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="border-b border-border/60 bg-surface">
      <div className="page-container flex flex-col items-start justify-between gap-4 py-10 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl text-balance">
            {title}
          </h1>
          {description && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base text-pretty">
              {description}
            </p>
          )}
        </div>
         {actions && <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div>}
      </div>
    </div>
  );
}
