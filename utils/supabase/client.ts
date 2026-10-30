import { createBrowserClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COOKIE_OPTIONS } from "./cookie";
import { normalizeApiResponse } from "@/utils/api/read-api-json";
import {
  accessTokenFromAuthCookies,
  authStorageKeyFromSupabaseUrl,
  parseCookieHeader,
  planDocumentCookieWrites,
  planExpiredAuthCookies,
  foreignDocumentSession,
  readNavigationType,
  readTabAuthJar,
  reconcileDuringSession,
  consumePendingTabAuthChange,
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
const TAB_AUTH_REALIGN_RELOAD_KEY = "fdm-tab-auth-realign-reload";

let inflightFetches = 0;
let documentCookiesDirty = false;
let pendingAdopt = false;

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
      const fresh = cookiesToSet.filter(
        (cookie) => cookie.value && cookie.options?.maxAge !== 0,
      );
      const expired = cookiesToSet.filter(
        (cookie) => !cookie.value || cookie.options?.maxAge === 0,
      );
      const replaced = new Set(fresh.map((cookie) => cookie.name));

      for (const cookie of fresh) jar.set(cookie.name, cookie.value);
      for (const cookie of expired) {
        if (!replaced.has(cookie.name)) jar.delete(cookie.name);
      }

      writeTabAuthJar(
        window.sessionStorage,
        Array.from(jar, ([name, value]) => ({ name, value })),
      );

      const writes: string[] = [];
      for (const cookie of fresh) {
        writes.push(serializeCookie(cookie.name, cookie.value, {
          path: cookie.options?.path || attributes.path,
          sameSite: normalizeSameSite(cookie.options?.sameSite) ?? attributes.sameSite,
          secure: cookie.options?.secure ?? attributes.secure,
          domain: cookie.options?.domain || attributes.domain,
          maxAge: typeof cookie.options?.maxAge === "number"
            ? cookie.options.maxAge
            : attributes.maxAge,
        }));
      }
      for (const cookie of expired) {
        if (replaced.has(cookie.name)) continue;
        writes.push(serializeCookie(cookie.name, "", {
          path: cookie.options?.path || attributes.path,
          sameSite: normalizeSameSite(cookie.options?.sameSite) ?? attributes.sameSite,
          secure: cookie.options?.secure ?? attributes.secure,
          domain: cookie.options?.domain || attributes.domain,
          maxAge: 0,
        }));
      }

      // A request already in flight reads document.cookie asynchronously.
      // Keep the jar current and publish the document only when nothing is out.
      if (inflightFetches > 0) {
        documentCookiesDirty = true;
        return;
      }
      applyCookieWrites(writes);
    },
  };
}

function bootstrapTabAuth() {
  const storageKey = currentStorageKey();
  const attributes = cookieAttributes();
  const previous = readTabAuthJar(window.sessionStorage);
  const documentCookies = parseCookieHeader(document.cookie);
  const pendingOwnAuth = consumePendingTabAuthChange(window.sessionStorage);
  const next = reconcileTabAuthJar({
    jar: previous,
    documentCookies,
    navType: readNavigationType(),
    storageKey,
    pendingOwnAuth,
  });
  writeTabAuthJar(window.sessionStorage, next);

  const writes =
    next.length === 0 && previous.length > 0
      ? planExpiredAuthCookies(documentCookies, storageKey, attributes)
      : planDocumentCookieWrites(next, documentCookies, storageKey, attributes);
  applyCookieWrites(writes);

  // The document was already rendered with whatever cookies the navigation
  // sent. If those belonged to another tab, the server props are wrong until
  // this tab requests the page again with its own cookies.
  const keptUser = userIdFromAuthCookies(next, storageKey);
  const documentUser = userIdFromAuthCookies(documentCookies, storageKey);
  if (!keptUser || !documentUser || keptUser === documentUser) {
    window.sessionStorage.removeItem(TAB_AUTH_REALIGN_RELOAD_KEY);
    return;
  }
  if (window.sessionStorage.getItem(TAB_AUTH_REALIGN_RELOAD_KEY) === "1") {
    window.sessionStorage.removeItem(TAB_AUTH_REALIGN_RELOAD_KEY);
    return;
  }
  window.sessionStorage.setItem(TAB_AUTH_REALIGN_RELOAD_KEY, "1");
  window.location.reload();
}

function installTabAuthSync() {
  const browserWindow = window as Window & { [TAB_AUTH_SYNC_FLAG]?: boolean };
  if (browserWindow[TAB_AUTH_SYNC_FLAG]) return;
  browserWindow[TAB_AUTH_SYNC_FLAG] = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const path = requestPath(input);
    if (inflightFetches === 0) syncTabAuthCookies(false);
    const nextInit = withTabAuthHeader(input, init);
    inflightFetches += 1;
    return originalFetch(input, nextInit)
      .then((response) => normalizeApiResponse(path, response))
      .finally(() => {
        if (adoptsForeignSession(path)) pendingAdopt = true;
        inflightFetches -= 1;
        if (inflightFetches === 0) {
          const adopt = pendingAdopt;
          pendingAdopt = false;
          syncTabAuthCookies(adopt);
        }
      });
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
  if (inflightFetches > 0) {
    if (adoptForeign) pendingAdopt = true;
    return;
  }

  const storageKey = currentStorageKey();
  const attributes = cookieAttributes();
  const jar = readTabAuthJar(window.sessionStorage);
  const documentCookies = parseCookieHeader(document.cookie);

  if (adoptForeign) {
    documentCookiesDirty = false;
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

  if (documentCookiesDirty) {
    documentCookiesDirty = false;
    applyCookieWrites(
      planDocumentCookieWrites(jar, documentCookies, storageKey, attributes),
    );
    return;
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

/**
 * Attach this tab's access token as `Authorization: Bearer <token>` to every
 * same-origin `/api/*` request. The token is read synchronously from the
 * per-tab jar (sessionStorage), so each data call carries the identity of THIS
 * tab instead of relying on the shared cookie jar. This is the chokepoint that
 * guarantees no `/api/*` call is left without the tab token, even ones that do
 * not go through `apiFetch`.
 *
 * Cross-origin requests (e.g. the Supabase token refresh) and requests that
 * already set an Authorization header are left untouched. The token is never
 * logged.
 */
function withTabAuthHeader(
  input: RequestInfo | URL,
  init?: RequestInit,
): RequestInit | undefined {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  let isSameOriginApi = false;
  try {
    const url = new URL(raw, window.location.origin);
    isSameOriginApi =
      url.origin === window.location.origin && url.pathname.startsWith("/api/");
  } catch {
    isSameOriginApi = false;
  }
  if (!isSameOriginApi) return init;
  // Guard for non-browser/test runtimes that lack the fetch primitives.
  if (typeof Headers === "undefined") return init;

  const existingHeaders =
    init?.headers ??
    (typeof Request !== "undefined" && input instanceof Request
      ? input.headers
      : undefined);
  const headers = new Headers(existingHeaders);
  if (headers.has("Authorization")) return init;

  const token = accessTokenFromAuthCookies(
    readTabAuthJar(window.sessionStorage),
    currentStorageKey(),
  );
  if (!token) return init;

  headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
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
