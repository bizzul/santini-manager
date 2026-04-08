"use client";

import { useEffect, useState } from "react";

import {
  buildSiteThemeStyleVars,
  getEstimatedSunlightLevel,
  resolveAdaptiveThemeColors,
  SITE_THEME_MODE_STORAGE_KEY,
  SITE_THEME_MODE_VALUES,
  type SiteThemeMode,
  type SiteThemeSettings,
} from "@/lib/site-theme";

type SiteThemeStyleProps = {
  themeSettings: SiteThemeSettings;
};

function getStoredMode(): SiteThemeMode | null {
  if (typeof window === "undefined") return null;
  const rawValue = window.localStorage.getItem(SITE_THEME_MODE_STORAGE_KEY);
  if (rawValue && SITE_THEME_MODE_VALUES.includes(rawValue as SiteThemeMode)) {
    return rawValue as SiteThemeMode;
  }
  return null;
}

export function SiteThemeStyle({ themeSettings }: SiteThemeStyleProps) {
  const [activeMode, setActiveMode] = useState<SiteThemeMode>(themeSettings.mode);

  useEffect(() => {
    const syncModeFromStorage = () => {
      setActiveMode(getStoredMode() ?? themeSettings.mode);
    };

    syncModeFromStorage();
    window.addEventListener("site-theme-mode-change", syncModeFromStorage);
    window.addEventListener("storage", syncModeFromStorage);
    return () => {
      window.removeEventListener("site-theme-mode-change", syncModeFromStorage);
      window.removeEventListener("storage", syncModeFromStorage);
    };
  }, [themeSettings.mode]);

  useEffect(() => {
    const root = document.documentElement;
    let cleanup: (() => void) | undefined;

    const applyVars = (vars: ReturnType<typeof buildSiteThemeStyleVars>) => {
      const entries = Object.entries(vars) as Array<[string, string]>;
      for (const [key] of entries) {
        root.style.removeProperty(key);
      }
      for (const [key, value] of entries) {
        root.style.setProperty(key, value);
      }
      return () => {
        for (const [key] of entries) {
          root.style.removeProperty(key);
        }
      };
    };

    root.dataset.siteThemeMode = activeMode;

    if (activeMode === "light") {
      cleanup = applyVars(buildSiteThemeStyleVars(themeSettings.light));
    } else if (activeMode === "dark") {
      cleanup = applyVars(buildSiteThemeStyleVars(themeSettings.dark));
    } else {
      let sensor: any;
      const applyAdaptive = () => {
        const sunlight = getEstimatedSunlightLevel();
        const adaptiveColors = resolveAdaptiveThemeColors(
          themeSettings.adaptive,
          sunlight
        );
        cleanup?.();
        cleanup = applyVars(buildSiteThemeStyleVars(adaptiveColors));
      };

      applyAdaptive();
      if (typeof window !== "undefined" && "AmbientLightSensor" in window) {
        try {
          const AmbientLightSensor = (window as any).AmbientLightSensor;
          sensor = new AmbientLightSensor();
          sensor.addEventListener("reading", () => {
            const lux = Number(sensor.illuminance || 0);
            const sunlight = Math.max(0, Math.min(1, lux / 1200));
            const adaptiveColors = resolveAdaptiveThemeColors(
              themeSettings.adaptive,
              sunlight
            );
            cleanup?.();
            cleanup = applyVars(buildSiteThemeStyleVars(adaptiveColors));
          });
          sensor.start();
        } catch {
          // Fallback automatic by local time already active.
        }
      }
      const intervalId = window.setInterval(applyAdaptive, 5 * 60 * 1000);
      return () => {
        window.clearInterval(intervalId);
        if (sensor && typeof sensor.stop === "function") {
          sensor.stop();
        }
        delete root.dataset.siteThemeMode;
        cleanup?.();
      };
    }

    return () => {
      delete root.dataset.siteThemeMode;
      cleanup?.();
    };
  }, [
    activeMode,
    themeSettings.light.pageBackground,
    themeSettings.light.pageCard,
    themeSettings.light.sidebarBackground,
    themeSettings.light.sidebarCard,
    themeSettings.dark.pageBackground,
    themeSettings.dark.pageCard,
    themeSettings.dark.sidebarBackground,
    themeSettings.dark.sidebarCard,
    themeSettings.adaptive.pageBackground,
    themeSettings.adaptive.pageCard,
    themeSettings.adaptive.sidebarBackground,
    themeSettings.adaptive.sidebarCard,
  ]);

  return null;
}
