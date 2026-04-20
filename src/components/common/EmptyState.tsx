import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  details?: string[];
  action?: ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, details, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-medium">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground text-pretty">{description}</p>
      )}
      {details && details.length > 0 ? (
        <ul className="mt-4 max-w-md space-y-1 text-left text-xs text-muted-foreground">
          {details.map((detail) => (
            <li key={detail}>• {detail}</li>
          ))}
        </ul>
      ) : null}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
