"use client";

import { cn } from "@/lib/utils";

interface DiagramSkeletonProps {
  className?: string;
  message?: string;
}

export function DiagramSkeleton({
  className,
  message = "Caricamento diagramma…",
}: DiagramSkeletonProps) {
  return (
    <div
      className={cn(
        "flex h-[70vh] min-h-[480px] w-full items-center justify-center rounded-lg border bg-page-soft animate-pulse",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
