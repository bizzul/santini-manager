"use client";

import { useTheme } from "next-themes";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  SITE_THEME_MODE_STORAGE_KEY,
  SITE_THEME_MODE_VALUES,
  type SiteThemeMode,
} from "@/lib/site-theme";

const MODE_META: Record<
  SiteThemeMode,
  { label: string; icon: ComponentType<{ className?: string }> }
> = {
  light: { label: "Light", icon: Sun },
  dark: { label: "Dark", icon: Moon },
  adaptive: { label: "Adaptive", icon: SunMoon },
};

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const [currentMode, setCurrentMode] = useState<SiteThemeMode>("light");
  const { setTheme } = useTheme();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const syncMode = () => {
      const stored = window.localStorage.getItem(SITE_THEME_MODE_STORAGE_KEY);
      if (stored && SITE_THEME_MODE_VALUES.includes(stored as SiteThemeMode)) {
        setCurrentMode(stored as SiteThemeMode);
        return;
      }

      const fromDataset = document.documentElement.dataset
        .siteThemeMode as SiteThemeMode | undefined;
      if (fromDataset && SITE_THEME_MODE_VALUES.includes(fromDataset)) {
        setCurrentMode(fromDataset);
      }
    };

    syncMode();
    window.addEventListener("site-theme-mode-change", syncMode);
    window.addEventListener("storage", syncMode);
    return () => {
      window.removeEventListener("site-theme-mode-change", syncMode);
      window.removeEventListener("storage", syncMode);
    };
  }, [mounted]);

  const handleSelectMode = (mode: SiteThemeMode) => {
    window.localStorage.setItem(SITE_THEME_MODE_STORAGE_KEY, mode);
    setCurrentMode(mode);
    setTheme(mode === "dark" ? "dark" : "light");
    window.dispatchEvent(new Event("site-theme-mode-change"));
  };

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-[hsl(var(--sidebar-border)/0.8)] bg-[hsl(var(--sidebar-card)/0.9)] p-2 shadow-[0_10px_24px_hsl(var(--sidebar-card-shadow)/0.12)] dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none",
        isCollapsed ? "w-[44px]" : "w-full"
      )}
    >
      <div
        className={cn(
          "flex gap-1",
          isCollapsed ? "flex-col items-center" : "items-center"
        )}
      >
        {SITE_THEME_MODE_VALUES.map((mode) => {
          const Icon = MODE_META[mode].icon;
          const isActive = currentMode === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => handleSelectMode(mode)}
              className={cn(
                "flex items-center justify-center rounded-xl border transition-colors",
                "border-transparent text-[hsl(var(--sidebar-foreground)/0.68)] hover:bg-[hsl(var(--sidebar-card-strong)/0.7)] hover:text-[hsl(var(--sidebar-foreground))]",
                "dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white",
                isCollapsed ? "h-9 w-9" : "h-9 flex-1 gap-1.5 px-2",
                isActive &&
                  "border-[hsl(var(--sidebar-border)/0.8)] bg-[hsl(var(--sidebar-card-strong)/0.95)] text-[hsl(var(--sidebar-foreground))] shadow-sm dark:border-white/10 dark:bg-white/15 dark:text-white"
              )}
              title={`Modalita ${MODE_META[mode].label}`}
            >
              <Icon className="h-4 w-4" />
              {!isCollapsed && (
                <span className="text-[11px] font-medium">{MODE_META[mode].label}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
