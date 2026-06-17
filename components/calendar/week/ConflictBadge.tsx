"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConflictBadgeProps {
  count: number;
  /** Variante compatta per header colonna-giorno. */
  size?: "sm" | "md";
  className?: string;
  title?: string;
}

/**
 * Badge "⚠ N" coerente con il badge "N conflitti" dell'header calendario.
 * Usa il token semantico destructive (no colori raw).
 */
export function ConflictBadge({
  count,
  size = "sm",
  className,
  title,
}: ConflictBadgeProps) {
  if (count <= 0) return null;

  return (
    <span
      title={title ?? `${count} sovrapposizion${count === 1 ? "e" : "i"}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-destructive/15 font-semibold text-destructive",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        className
      )}
    >
      <AlertTriangle className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {count}
    </span>
  );
}
