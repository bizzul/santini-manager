import { createBrowserClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COOKIE_OPTIONS } from "./cookie";
import {
  authStorageKeyFromSupabaseUrl,
  parseCookieHeader,
  planDocumentCookieWrites,
  planExpiredAuthCookies,
  foreignDocumentSession,
  readNavigationType,
  readTabAuthJar,
  reconcileDuringSession,
  reconcileTabAuthJar,
  serializeCookie,
  userIdFromAuthCookies,
  writeTabAuthJar,
  type AuthCookie,
  type CookieWriteAttributes,
} from "./tab-auth-storage";

// Singleton instance to prevent multiple clients from being created
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

const TAB_AUTH_SYNC_FLAG = "__fdmTabAuthSyncInstalled";

/**
 * Browser Supabase client.
 *
 * Session persistence is per tab (sessionStorage), not the shared cookie jar.
 * `createBrowserClient` overwrites `auth.storage` with its cookie adapter, so
 * the adapter below is backed by sessionStorage. Cookies are still mirrored
 * for the server (middleware, route handlers, server actions) and rewritten
 * from this tab before a request, so a login in another tab cannot become
 * the user of this one. Auto-refresh stays enabled.
 */
export function createClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (typeof window !== "undefined") {
    bootstrapTabAuth();
    installTabAuthSync();
  }

  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: true,
      cookieOptions: COOKIE_OPTIONS,
      ...(typeof window !== "undefined" ? { cookies: tabCookieMethods() } : {}),
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
      global: {
        headers: {
          "X-Client-Info": "supabase-js-browser",
        },
      },
    },
  );

  if (typeof window !== "undefined") {
    isolateAuthBroadcast(supabaseClient);
  }

  return supabaseClient;
}

function tabCookieMethods() {
  const attributes = cookieAttributes();
  return {
    getAll(): AuthCookie[] {
      return readTabAuthJar(window.sessionStorage);
    },
    setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
      const jar = new Map(
        readTabAuthJar(window.sessionStorage).map((cookie) => [cookie.name, cookie.value]),
      );

      for (const cookie of cookiesToSet) {
        const expired = !cookie.value || cookie.options?.maxAge === 0;
        if (expired) jar.delete(cookie.name);
        else jar.set(cookie.name, cookie.value);

        document.cookie = serializeCookie(cookie.name, expired ? "" : cookie.value, {
          path: cookie.options?.path || attributes.path,
          sameSite: normalizeSameSite(cookie.options?.sameSite) ?? attributes.sameSite,
          secure: cookie.options?.secure ?? attributes.secure,
          domain: cookie.options?.domain || attributes.domain,
          maxAge: expired
            ? 0
            : typeof cookie.options?.maxAge === "number"
              ? cookie.options.maxAge
              : attributes.maxAge,
        });
      }

      writeTabAuthJar(
        window.sessionStorage,
        Array.from(jar, ([name, value]) => ({ name, value })),
      );
    },
  };
}

function bootstrapTabAuth() {
  const storageKey = currentStorageKey();
  const attributes = cookieAttributes();
  const previous = readTabAuthJar(window.sessionStorage);
  const documentCookies = parseCookieHeader(document.cookie);
  const next = reconcileTabAuthJar({
    jar: previous,
    documentCookies,
    navType: readNavigationType(),
    storageKey,
  });
  writeTabAuthJar(window.sessionStorage, next);

  const writes =
    next.length === 0 && previous.length > 0
      ? planExpiredAuthCookies(documentCookies, storageKey, attributes)
      : planDocumentCookieWrites(next, documentCookies, storageKey, attributes);
  applyCookieWrites(writes);
}

function installTabAuthSync() {
  const browserWindow = window as Window & { [TAB_AUTH_SYNC_FLAG]?: boolean };
  if (browserWindow[TAB_AUTH_SYNC_FLAG]) return;
  browserWindow[TAB_AUTH_SYNC_FLAG] = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    syncTabAuthCookies();
    try {
      return await originalFetch(input, init);
    } finally {
      // A login or impersonation response in this tab replaces the jar.
      // Any other response keeps this tab's user if the cookie jar was overwritten.
      syncTabAuthCookies(adoptsForeignSession(requestPath(input)));
    }
  }) as typeof window.fetch;

  const restoreThisTab = () => syncTabAuthCookies(false);
  window.addEventListener("focus", restoreThisTab);
  window.addEventListener("pageshow", restoreThisTab);
  window.addEventListener("beforeunload", restoreThisTab);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") restoreThisTab();
  });
  document.addEventListener("click", restoreThisTab, true);
}

function syncTabAuthCookies(adoptForeign = false) {
  const storageKey = currentStorageKey();
  const attributes = cookieAttributes();
  const jar = readTabAuthJar(window.sessionStorage);
  const documentCookies = parseCookieHeader(document.cookie);

  if (adoptForeign) {
    const foreign = foreignDocumentSession(jar, documentCookies, storageKey);
    if (foreign) {
      writeTabAuthJar(window.sessionStorage, foreign);
      return;
    }
    // This tab's login/logout response cleared the shared cookies.
    if (
      userIdFromAuthCookies(jar, storageKey) &&
      !userIdFromAuthCookies(documentCookies, storageKey)
    ) {
      writeTabAuthJar(window.sessionStorage, []);
      applyCookieWrites(planExpiredAuthCookies(documentCookies, storageKey, attributes));
      return;
    }
  }

  const next = reconcileDuringSession(jar, documentCookies, storageKey);
  writeTabAuthJar(window.sessionStorage, next);
  applyCookieWrites(
    planDocumentCookieWrites(next, documentCookies, storageKey, attributes),
  );
}

function requestPath(input: RequestInfo | URL): string {
  const raw =
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  try {
    return new URL(raw, window.location.origin).pathname;
  } catch {
    return "";
  }
}

function adoptsForeignSession(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/logout" ||
    pathname.startsWith("/quick-login") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/auth")
  );
}

function applyCookieWrites(writes: string[]) {
  for (const write of writes) document.cookie = write;
}

function currentStorageKey(): string {
  return authStorageKeyFromSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!);
}

function normalizeSameSite(value: CookieOptions["sameSite"]): CookieWriteAttributes["sameSite"] | undefined {
  if (value === "lax" || value === "strict" || value === "none") return value;
  return undefined;
}

function cookieAttributes(): CookieWriteAttributes {
  const sameSite = COOKIE_OPTIONS.sameSite;
  return {
    path: COOKIE_OPTIONS.path || "/",
    sameSite: sameSite === "strict" || sameSite === "none" ? sameSite : "lax",
    secure: Boolean(COOKIE_OPTIONS.secure),
    domain: COOKIE_OPTIONS.domain,
    maxAge: typeof COOKIE_OPTIONS.maxAge === "number"
      ? COOKIE_OPTIONS.maxAge
      : 60 * 60 * 24 * 60,
  };
}

function isolateAuthBroadcast(client: SupabaseClient) {
  const auth = client.auth as typeof client.auth & {
    broadcastChannel?: { close(): void } | null;
  };
  const channel = auth.broadcastChannel;
  auth.broadcastChannel = null;
  try {
    channel?.close();
  } catch {
    // Already closed.
  }
}
