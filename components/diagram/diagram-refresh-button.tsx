"use client";

import { useState } from "react";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiagramRefreshButtonProps {
  onRefresh: () => void;
  /** When true, shows a short spinning animation after click. */
  showFeedback?: boolean;
  className?: string;
}

/** Resets the diagram viewport (via caller) — typically fitView to the default framing. */
export function DiagramRefreshButton({
  onRefresh,
  showFeedback = false,
  className,
}: DiagramRefreshButtonProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleClick = () => {
    onRefresh();
    if (!showFeedback) return;
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={showFeedback && refreshing}
      aria-label="Ripristina diagramma alla vista iniziale"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border diagram-stage-chrome px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:brightness-105",
        className,
      )}
    >
      <RotateCw
        className={cn("h-3.5 w-3.5", showFeedback && refreshing && "animate-spin")}
      />
      Aggiorna
    </button>
  );
}
