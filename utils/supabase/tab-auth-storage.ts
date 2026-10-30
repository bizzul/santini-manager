import { stringFromBase64URL } from "@supabase/ssr";

/**
 * Auth session for one browser tab.
 *
 * `@supabase/ssr` `createBrowserClient` always stores the session in cookies
 * (it overwrites `auth.storage`). Cookies and the auth BroadcastChannel are
 * shared by every tab on the origin, so a login in one tab becomes the user
 * in the others. This jar lives in sessionStorage, which is per-tab.
 */
export const TAB_AUTH_JAR_STORAGE_KEY = "fdm-tab-auth-jar";

/** Set by this tab before login, logout, quick-login, or impersonation. */
export const TAB_AUTH_PENDING_KEY = "fdm-tab-auth-pending-login";

const BASE64_PREFIX = "base64-";

export type AuthCookie = { name: string; value: string };

export type TabNavigationType = "navigate" | "reload" | "back_forward" | "prerender";

export type CookieWriteAttributes = {
  path: string;
  sameSite: "lax" | "strict" | "none";
  secure: boolean;
  domain?: string;
  maxAge: number;
};

export interface TabAuthStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function authStorageKeyFromSupabaseUrl(supabaseUrl: string): string {
  const hostname = new URL(supabaseUrl).hostname;
  return `sb-${hostname.split(".")[0]}-auth-token`;
}

export function isSupabaseAuthCookieName(name: string, storageKey: string): boolean {
  if (name === storageKey || name.startsWith(`${storageKey}.`)) return true;
  const verifierKey = `${storageKey}-code-verifier`;
  return name === verifierKey || name.startsWith(`${verifierKey}.`);
}

export function readNavigationType(): TabNavigationType {
  try {
    const entry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (
      entry?.type === "reload" ||
      entry?.type === "back_forward" ||
      entry?.type === "prerender"
    ) {
      return entry.type;
    }
  } catch {
    // performance is unavailable during prerender or very old browsers
  }
  return "navigate";
}

export function parseCookieHeader(header: string): AuthCookie[] {
  if (!header) return [];
  const cookies: AuthCookie[] = [];
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const name = safeDecode(trimmed.slice(0, separator));
    const value = safeDecode(trimmed.slice(separator + 1));
    cookies.push({ name, value });
  }
  return cookies;
}

export function readTabAuthJar(storage: TabAuthStorage): AuthCookie[] {
  try {
    const raw = storage.getItem(TAB_AUTH_JAR_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAuthCookie);
  } catch {
    return [];
  }
}

export function writeTabAuthJar(storage: TabAuthStorage, cookies: AuthCookie[]): void {
  if (cookies.length === 0) {
    storage.removeItem(TAB_AUTH_JAR_STORAGE_KEY);
    return;
  }
  storage.setItem(TAB_AUTH_JAR_STORAGE_KEY, JSON.stringify(cookies));
}

export function markPendingTabAuthChange(storage: TabAuthStorage): void {
  try {
    storage.setItem(TAB_AUTH_PENDING_KEY, "1");
  } catch {
    // sessionStorage can throw in private mode; login still has the fetch path.
  }
}

export function clearPendingTabAuthChange(storage: TabAuthStorage): void {
  try {
    storage.removeItem(TAB_AUTH_PENDING_KEY);
  } catch {
    // Ignore storage errors.
  }
}

/** Reads and removes the marker so a later internal navigation cannot reuse it. */
export function consumePendingTabAuthChange(storage: TabAuthStorage): boolean {
  try {
    const pending = storage.getItem(TAB_AUTH_PENDING_KEY) === "1";
    if (pending) storage.removeItem(TAB_AUTH_PENDING_KEY);
    return pending;
  } catch {
    return false;
  }
}

type DecodedAuthSession = {
  access_token?: string;
  user?: { id?: string };
};

/** Parse the Supabase session object stored across the auth cookie chunks. */
function decodeAuthSession(
  cookies: AuthCookie[],
  storageKey: string,
): DecodedAuthSession | null {
  const combined = combineCookieChunks(storageKey, cookies);
  if (!combined) return null;
  try {
    const raw = combined.startsWith(BASE64_PREFIX)
      ? stringFromBase64URL(combined.slice(BASE64_PREFIX.length))
      : combined;
    return JSON.parse(raw) as DecodedAuthSession;
  } catch {
    return null;
  }
}

export function userIdFromAuthCookies(
  cookies: AuthCookie[],
  storageKey: string,
): string | null {
  const session = decodeAuthSession(cookies, storageKey);
  if (!session) return null;
  try {
    if (session.user?.id) return session.user.id;
    if (!session.access_token) return null;
    const payload = session.access_token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(decodeBase64Url(payload)) as { sub?: string };
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Access token of this tab's stored session, read from the per-tab jar.
 *
 * This is the identity the tab sends as `Authorization: Bearer <token>` on
 * `/api/*` requests, so the server can trust the tab's own user instead of the
 * shared cookie jar. Returns null when the tab has no session.
 */
export function accessTokenFromAuthCookies(
  cookies: AuthCookie[],
  storageKey: string,
): string | null {
  const session = decodeAuthSession(cookies, storageKey);
  const token = session?.access_token;
  return typeof token === "string" && token.length > 0 ? token : null;
}

/**
 * Decide which session this tab keeps when the document loads.
 *
 * - Empty tab (new tab, or the process was killed): take the cookies. This is
 *   how a PWA cold start becomes a tab session.
 * - Reload / back-forward: keep this tab's user even if another tab overwrote
 *   the shared cookies. Same-user cookie updates (token refresh) are kept.
 * - Navigate: keep this tab's user too. A click inside the app cannot be told
 *   apart from another tab's login by the navigation type alone. Adopt the
 *   document cookies only when this tab set the pending-auth marker before
 *   starting login, logout, quick-login, or impersonation.
 */
export function reconcileTabAuthJar(input: {
  jar: AuthCookie[];
  documentCookies: AuthCookie[];
  navType: TabNavigationType;
  storageKey: string;
  pendingOwnAuth?: boolean;
}): AuthCookie[] {
  const jarAuth = authCookies(input.jar, input.storageKey);
  const docAuth = authCookies(input.documentCookies, input.storageKey);
  const jarUser = userIdFromAuthCookies(jarAuth, input.storageKey);
  const docUser = userIdFromAuthCookies(docAuth, input.storageKey);
  const tabKeepsSession =
    input.navType === "reload" || input.navType === "back_forward";
  const adoptDocument =
    input.pendingOwnAuth === true && !tabKeepsSession;

  if (!jarUser) return docAuth;
  if (!docUser) return adoptDocument ? [] : jarAuth;
  if (docUser === jarUser) return mergeSameUser(jarAuth, docAuth, input.storageKey);
  return adoptDocument ? docAuth : jarAuth;
}

/**
 * Cookies written by a login or impersonation response in this tab.
 * Null when the document still belongs to this tab's user.
 */
export function foreignDocumentSession(
  jar: AuthCookie[],
  documentCookies: AuthCookie[],
  storageKey: string,
): AuthCookie[] | null {
  const jarAuth = authCookies(jar, storageKey);
  const docAuth = authCookies(documentCookies, storageKey);
  const jarUser = userIdFromAuthCookies(jarAuth, storageKey);
  const docUser = userIdFromAuthCookies(docAuth, storageKey);
  if (docUser && docUser !== jarUser) return docAuth;
  return null;
}

/**
 * While the tab stays open, another tab may overwrite document.cookie.
 * Same user: keep the newer cookie token (refresh). Different user: keep the jar.
 */
export function reconcileDuringSession(
  jar: AuthCookie[],
  documentCookies: AuthCookie[],
  storageKey: string,
): AuthCookie[] {
  const jarAuth = authCookies(jar, storageKey);
  const docAuth = authCookies(documentCookies, storageKey);
  const jarUser = userIdFromAuthCookies(jarAuth, storageKey);
  const docUser = userIdFromAuthCookies(docAuth, storageKey);
  if (jarUser && docUser === jarUser) {
    return mergeSameUser(jarAuth, docAuth, storageKey);
  }
  return jarAuth;
}

export function planDocumentCookieWrites(
  jar: AuthCookie[],
  documentCookies: AuthCookie[],
  storageKey: string,
  attributes: CookieWriteAttributes,
): string[] {
  const jarAuth = authCookies(jar, storageKey);
  if (jarAuth.length === 0) return [];

  const docAuth = authCookies(documentCookies, storageKey);
  const jarNames = new Set(jarAuth.map((cookie) => cookie.name));
  const writes: string[] = [];

  // Write this tab's cookies before expiring stale names. Deleting first leaves
  // document.cookie with no readable session while sessionStorage still has
  // the user, and an in-flight request can be sent in that gap.
  for (const cookie of jarAuth) {
    const current = docAuth.find((entry) => entry.name === cookie.name);
    if (!current || current.value !== cookie.value) {
      writes.push(serializeCookie(cookie.name, cookie.value, attributes));
    }
  }

  for (const cookie of docAuth) {
    if (!jarNames.has(cookie.name)) {
      writes.push(serializeCookie(cookie.name, "", { ...attributes, maxAge: 0 }));
    }
  }

  const baseKeyWrite = `${storageKey}=`;
  const baseIndex = writes.findIndex((write) => write.startsWith(baseKeyWrite));
  if (baseIndex > 0) {
    const [baseWrite] = writes.splice(baseIndex, 1);
    writes.unshift(baseWrite);
  }

  return writes;
}

export function planExpiredAuthCookies(
  documentCookies: AuthCookie[],
  storageKey: string,
  attributes: CookieWriteAttributes,
): string[] {
  return authCookies(documentCookies, storageKey).map((cookie) =>
    serializeCookie(cookie.name, "", { ...attributes, maxAge: 0 }),
  );
}

export function serializeCookie(
  name: string,
  value: string,
  attributes: CookieWriteAttributes,
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (attributes.domain) parts.push(`Domain=${attributes.domain}`);
  parts.push(`Path=${attributes.path || "/"}`);
  parts.push(`Max-Age=${attributes.maxAge}`);
  const sameSite = attributes.sameSite;
  parts.push(`SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`);
  if (attributes.secure) parts.push("Secure");
  return parts.join("; ");
}

function authCookies(cookies: AuthCookie[], storageKey: string): AuthCookie[] {
  return cookies.filter((cookie) => isSupabaseAuthCookieName(cookie.name, storageKey));
}

function mergeSameUser(
  jarAuth: AuthCookie[],
  docAuth: AuthCookie[],
  storageKey: string,
): AuthCookie[] {
  const isToken = (name: string) =>
    name === storageKey || name.startsWith(`${storageKey}.`);
  const docTokens = docAuth.filter((cookie) => isToken(cookie.name));
  const docVerifier = docAuth.filter((cookie) => !isToken(cookie.name));
  const jarVerifier = jarAuth.filter((cookie) => !isToken(cookie.name));
  return [...docTokens, ...(docVerifier.length > 0 ? docVerifier : jarVerifier)];
}

function combineCookieChunks(key: string, cookies: AuthCookie[]): string | null {
  const values = new Map(cookies.map((cookie) => [cookie.name, cookie.value]));
  const direct = values.get(key);
  if (direct) return direct;

  const parts: string[] = [];
  for (let index = 0; ; index += 1) {
    const chunk = values.get(`${key}.${index}`);
    if (!chunk) break;
    parts.push(chunk);
  }
  return parts.length > 0 ? parts.join("") : null;
}

function isAuthCookie(value: unknown): value is AuthCookie {
  if (!value || typeof value !== "object") return false;
  const cookie = value as { name?: unknown; value?: unknown };
  return typeof cookie.name === "string" && typeof cookie.value === "string";
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
