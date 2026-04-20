import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  details?: string[];
  action?: ReactNode;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't complete the analysis. Please try again in a moment.",
  details,
  action,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground text-pretty">{description}</p>
      {details && details.length > 0 ? (
        <ul className="mt-4 max-w-sm space-y-1 text-left text-xs text-muted-foreground">
          {details.map((detail) => (
            <li key={detail}>• {detail}</li>
          ))}
        </ul>
      ) : null}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
