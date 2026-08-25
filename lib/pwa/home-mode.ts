/**
 * Home-screen (PWA) launch preference: full manager vs time tracking only.
 * Stored in a first-party cookie so it survives closing the installed app.
 */

export const PWA_HOME_COOKIE = "fdm-pwa-home";
export const PWA_HOME_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type PwaHomeMode = "manager" | "ore";

export function isPwaHomeMode(
  value: string | null | undefined,
): value is PwaHomeMode {
  return value === "manager" || value === "ore";
}

export function pwaHomeCookieOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    maxAge: PWA_HOME_MAX_AGE,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  };
}

export function readPwaHomeModeFromCookieHeader(
  cookieHeader: string,
): PwaHomeMode | undefined {
  const match = cookieHeader
    .split("; ")
    .find((row) => row.startsWith(`${PWA_HOME_COOKIE}=`));
  if (!match) return undefined;
  const value = decodeURIComponent(match.slice(PWA_HOME_COOKIE.length + 1));
  return isPwaHomeMode(value) ? value : undefined;
}

export function resolveOreLandingPath(lastSpace: string | undefined): string {
  if (!lastSpace) return "/sites/select";
  return `/sites/${lastSpace}/timetracking`;
}

export function isTimetrackingSitePath(pathname: string): boolean {
  return /^\/sites\/[^/]+\/timetracking(?:\/|$)/.test(pathname);
}

/**
 * When the installed-app preference is "ore", send the user back to
 * time tracking instead of the rest of the manager.
 */
export function oreRedirectPath(
  pathname: string,
  lastSpace?: string,
): string | null {
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/launch") ||
    pathname.startsWith("/pwa/") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/offline") ||
    pathname.startsWith("/quick-login")
  ) {
    return null;
  }

  if (pathname.startsWith("/sites/select")) return null;
  if (isTimetrackingSitePath(pathname)) return null;

  const siteMatch = pathname.match(/^\/sites\/([^/]+)/);
  if (siteMatch) {
    return `/sites/${siteMatch[1]}/timetracking`;
  }

  if (
    pathname.startsWith("/personale") ||
    pathname.startsWith("/administration")
  ) {
    return resolveOreLandingPath(lastSpace);
  }

  return null;
}

export type PwaLaunchDecision =
  | { type: "chooser" }
  | { type: "ore"; path: string }
  | { type: "continue"; mode?: PwaHomeMode };

/**
 * Resolves how the post-login / PWA start_url handler should behave.
 * An explicit `home` query param (shortcuts, chooser) wins and is persisted.
 */
export function decidePwaLaunch(input: {
  homeMode?: PwaHomeMode;
  homeParam?: string | null;
  sourcePwa: boolean;
  lastSpace?: string;
}): PwaLaunchDecision {
  const persisted = isPwaHomeMode(input.homeParam)
    ? input.homeParam
    : input.homeMode;

  if (persisted === "ore") {
    return { type: "ore", path: resolveOreLandingPath(input.lastSpace) };
  }

  if (persisted === "manager") {
    return { type: "continue", mode: "manager" };
  }

  if (input.sourcePwa) {
    return { type: "chooser" };
  }

  return { type: "continue" };
}

/** Allow only same-origin manager paths after login (no open redirects). */
export function sanitizeInternalNextPath(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.includes("://")) return null;

  const pathOnly = value.split("?")[0]?.split("#")[0] ?? "";
  const allowed =
    pathOnly === "/launch" ||
    pathOnly.startsWith("/pwa/") ||
    pathOnly.startsWith("/sites/");
  return allowed ? value : null;
}

export const PWA_HOME_GATE_SKIP_PREFIXES = [
  "/login",
  "/pwa/home",
  "/offline",
  "/auth",
  "/quick-login",
  "/setup-organization",
] as const;

export function shouldOpenPwaHomeChooser(input: {
  standalone: boolean;
  pathname: string;
  homeMode?: PwaHomeMode;
}): boolean {
  if (!input.standalone) return false;
  if (input.homeMode) return false;
  const path = input.pathname;
  return !PWA_HOME_GATE_SKIP_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function shouldOpenPwaLaunchFromRoot(input: {
  standalone: boolean;
  pathname: string;
  homeMode?: PwaHomeMode;
}): boolean {
  return (
    input.standalone && input.pathname === "/" && Boolean(input.homeMode)
  );
}
