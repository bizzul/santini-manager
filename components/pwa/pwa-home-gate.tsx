"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isStandaloneDisplay } from "@/lib/pwa/display-mode";
import {
  readPwaHomeModeFromCookieHeader,
  shouldOpenPwaHomeChooser,
  shouldOpenPwaLaunchFromRoot,
} from "@/lib/pwa/home-mode";

/**
 * Installed-app (standalone) gate:
 * - first launch without a preference → chooser
 * - later launches of `/` (old start_url) → /launch
 */
export function PwaHomeGate() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isStandaloneDisplay(window)) return;

    const homeMode = readPwaHomeModeFromCookieHeader(document.cookie);
    if (shouldOpenPwaHomeChooser({ standalone: true, pathname, homeMode })) {
      router.replace("/pwa/home");
      return;
    }
    if (shouldOpenPwaLaunchFromRoot({ standalone: true, pathname, homeMode })) {
      router.replace("/launch");
    }
  }, [pathname, router]);

  return null;
}
