"use client";

import { createClient } from "./client";

/**
 * True when `rawUrl` resolves to a same-origin `/api/*` endpoint.
 *
 * The Authorization header carries the tab's identity, so we only attach it to
 * our own API. Cross-origin calls (e.g. Supabase token refresh, external
 * services) must never receive the token.
 */
function isSameOriginApiUrl(rawUrl: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(rawUrl, window.location.origin);
    return (
      url.origin === window.location.origin && url.pathname.startsWith("/api/")
    );
  } catch {
    return false;
  }
}

function urlFromInput(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/**
 * `fetch` wrapper that sends the current tab's Supabase access token as an
 * `Authorization: Bearer <token>` header on same-origin `/api/*` requests.
 *
 * Why: on a shared PC the auth cookie jar is shared by every window of the
 * origin, so a login in one window can become the "current user" of a cookie
 * read in another. The session token, however, lives in sessionStorage and is
 * genuinely per tab. Sending it explicitly lets the server resolve the identity
 * of THIS tab regardless of what the shared cookie currently holds.
 *
 * The token is never logged. For non-API or cross-origin URLs this behaves like
 * a plain `fetch`. An existing Authorization header is preserved.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (!isSameOriginApiUrl(urlFromInput(input))) {
    return fetch(input, init);
  }

  let token: string | undefined;
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  } catch {
    token = undefined;
  }

  if (!token || typeof Headers === "undefined") {
    return fetch(input, init);
  }

  const existingHeaders =
    init?.headers ??
    (typeof Request !== "undefined" && input instanceof Request
      ? input.headers
      : undefined);
  const headers = new Headers(existingHeaders);
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
}
