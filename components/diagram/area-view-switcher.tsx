"use client";

import { GitBranch, TableProperties } from "lucide-react";
import { cn } from "@/lib/utils";

export type AreaViewMode = "table" | "diagram";

interface AreaViewSwitcherProps {
  value: AreaViewMode;
  onChange: (mode: AreaViewMode) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Compact Tabella / Diagramma toggle for areas without an existing grid toggle
 * (Progetti, Clienti, Collaboratori, Kanban).
 */
export function AreaViewSwitcher({
  value,
  onChange,
  disabled = false,
  className,
}: AreaViewSwitcherProps) {
  const options: Array<{
    value: AreaViewMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { value: "table", label: "Tabella", icon: TableProperties },
    { value: "diagram", label: "Diagramma", icon: GitBranch },
  ];

  return (
    <div
      role="tablist"
      aria-label="Modalità di visualizzazione"
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border bg-muted p-1",
        className,
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
