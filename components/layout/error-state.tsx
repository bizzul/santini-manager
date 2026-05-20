import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string | React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  variant?: "inline" | "block";
}

/**
 * ErrorState - Standard error banner / card using destructive tokens.
 *
 * - "inline" (default): compact banner suitable for forms
 * - "block": larger card suitable as a full-content placeholder
 */
export function ErrorState({
  title = "Si e verificato un errore",
  description,
  action,
  className,
  variant = "inline",
}: ErrorStateProps) {
  if (variant === "block") {
    return (
      <div
        role="alert"
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-6 py-12 text-center text-destructive",
          className
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="max-w-md text-sm text-destructive/90">{description}</p>
        ) : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive",
        className
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex flex-1 flex-col gap-1">
        <p className="font-medium">{title}</p>
        {description ? (
          <div className="text-destructive/90">{description}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
