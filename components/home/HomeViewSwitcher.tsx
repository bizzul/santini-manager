"use client";

import { useEffect, useState } from "react";
import { GitBranch, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

type HomeViewMode = "diagram" | "standard";

interface HomeViewSwitcherProps {
  domain: string;
  standard: React.ReactNode;
  diagram: React.ReactNode;
  /**
   * Forces a specific view (e.g. from `?view=diagram` preview). When set,
   * the user preference in localStorage is neither read nor written.
   */
  forcedView?: HomeViewMode;
}

const storageKey = (domain: string) => `fdm-home-view:${domain}`;

/**
 * Toggle between the diagram view (default) and the standard module grid on
 * the site home. Only one mode is visible at a time; the choice is
 * remembered per user/browser in localStorage (unless forced via preview).
 */
export function HomeViewSwitcher({
  domain,
  standard,
  diagram,
  forcedView,
}: HomeViewSwitcherProps) {
  const [mode, setMode] = useState<HomeViewMode>(forcedView ?? "diagram");

  useEffect(() => {
    if (forcedView) {
      setMode(forcedView);
      return;
    }
    const saved = window.localStorage.getItem(storageKey(domain));
    if (saved === "standard" || saved === "diagram") {
      setMode(saved);
    }
  }, [domain, forcedView]);

  const selectMode = (next: HomeViewMode) => {
    setMode(next);
    // In forced (preview) mode, never persist the user's preference.
    if (forcedView) return;
    try {
      window.localStorage.setItem(storageKey(domain), next);
    } catch {
      // localStorage unavailable (private mode): keep in-memory state only.
    }
  };

  const options: Array<{
    value: HomeViewMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { value: "diagram", label: "Diagramma", icon: GitBranch },
    { value: "standard", label: "Standard", icon: LayoutGrid },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div
        role="tablist"
        aria-label="Modalità di visualizzazione della home"
        className="inline-flex w-fit items-center gap-1 rounded-lg border bg-muted p-1"
      >
        {options.map((option) => {
          const Icon = option.icon;
          const active = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectMode(option.value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {option.label}
            </button>
          );
        })}
      </div>

      {mode === "diagram" ? (
        <div className="min-h-0 flex-1">{diagram}</div>
      ) : (
        <div>{standard}</div>
      )}
    </div>
  );
}
