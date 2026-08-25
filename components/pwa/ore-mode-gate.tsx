"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LAST_SPACE_COOKIE } from "@/lib/personale/vista";
import {
  oreRedirectPath,
  readPwaHomeModeFromCookieHeader,
} from "@/lib/pwa/home-mode";

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return undefined;
  return decodeURIComponent(match.slice(name.length + 1)) || undefined;
}

/**
 * Enforces the "solo ore" home preference on the client, so it still
 * applies if the request proxy is skipped.
 */
export function OreModeGate() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const mode = readPwaHomeModeFromCookieHeader(document.cookie);
    if (mode !== "ore") return;
    const lastSpace = readCookie(LAST_SPACE_COOKIE);
    const target = oreRedirectPath(pathname, lastSpace);
    if (target) {
      router.replace(target);
    }
  }, [pathname, router]);

  return null;
}
