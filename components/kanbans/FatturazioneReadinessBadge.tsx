"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FatturazioneReadinessStato } from "@/lib/fatturazione-readiness";

type FatturazioneReadinessBadgeProps = {
  stato?: FatturazioneReadinessStato | null;
  compact?: boolean;
  readyLabel: string;
  waitingLabel: string;
};

export function FatturazioneReadinessBadge({
  stato,
  compact = false,
  readyLabel,
  waitingLabel,
}: FatturazioneReadinessBadgeProps) {
  const isReady = stato === "pronto";
  const sizeClass = compact ? "h-4 w-4" : "h-5 w-5";
  const iconClass = compact ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <span
      title={isReady ? readyLabel : waitingLabel}
      aria-label={isReady ? readyLabel : waitingLabel}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        sizeClass,
        isReady
          ? "bg-success text-success-foreground"
          : "bg-warning text-warning-foreground",
      )}
    >
      {isReady ? (
        <Check className={iconClass} strokeWidth={3} />
      ) : (
        <span className="block h-1.5 w-1.5 rounded-full bg-current" />
      )}
    </span>
  );
}
