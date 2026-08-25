"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Extra filters collapse behind a 44px summary on phones; stay always
 * visible from `md` up (CSS forces the panel open on desktop).
 */
export function MobileFilters({
  title = "Filtri",
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("fdm-mobile-filters group mb-3", className)}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium md:hidden">
        {title}
        <span className="text-muted-foreground group-open:hidden">Apri</span>
        <span className="hidden text-muted-foreground group-open:inline">Chiudi</span>
      </summary>
      <div className="mt-3 md:mt-0">{children}</div>
    </details>
  );
}
