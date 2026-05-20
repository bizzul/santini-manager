import * as React from "react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  variant?: "table" | "form" | "sheet" | "list";
  rows?: number;
  className?: string;
}

/**
 * LoadingState - Coherent skeleton placeholder for the most common page bodies.
 *
 * Variants:
 *  - "table": filter bar + rows
 *  - "form":  stacked field skeletons
 *  - "sheet": detail-card skeleton
 *  - "list":  bullet rows
 */
export function LoadingState({
  variant = "table",
  rows = 6,
  className,
}: LoadingStateProps) {
  if (variant === "form") {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "sheet") {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="ml-auto h-9 w-32" />
      </div>
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-3">
          <Skeleton className="h-5 w-1/3" />
        </div>
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
