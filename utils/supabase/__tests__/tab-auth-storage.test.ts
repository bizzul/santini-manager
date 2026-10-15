import { createChunks, stringFromBase64URL, stringToBase64URL } from "@supabase/ssr";
import {
  TAB_AUTH_JAR_STORAGE_KEY,
  authStorageKeyFromSupabaseUrl,
  parseCookieHeader,
  planDocumentCookieWrites,
  planExpiredAuthCookies,
  readTabAuthJar,
  reconcileDuringSession,
  reconcileTabAuthJar,
  serializeCookie,
  userIdFromAuthCookies,
  writeTabAuthJar,
  type AuthCookie,
  type CookieWriteAttributes,
  type TabAuthStorage,
} from "@/utils/supabase/tab-auth-storage";

const STORAGE_KEY = "sb-project-auth-token";
const ATTRIBUTES: CookieWriteAttributes = {
  path: "/",
  sameSite: "lax",
  secure: false,
  maxAge: 60 * 60 * 24 * 60,
};

function memoryStorage(): TabAuthStorage & { snapshot(): string | null } {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    snapshot: () => values.get(TAB_AUTH_JAR_STORAGE_KEY) ?? null,
  };
}

function fakeJwt(sub: string, suffix: string): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ sub, suffix })}.sig`;
}

function cookiesForUser(userId: string, tokenSuffix = "1", chunkSize?: number): AuthCookie[] {
  const session = JSON.stringify({
    access_token: fakeJwt(userId, tokenSuffix),
    refresh_token: `refresh-${userId}-${tokenSuffix}`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    expires_in: 3600,
    token_type: "bearer",
    user: { id: userId },
  });
  const encoded = `base64-${stringToBase64URL(session)}`;
  return createChunks(STORAGE_KEY, encoded, chunkSize);
}

function userId(cookies: AuthCookie[]): string | null {
  return userIdFromAuthCookies(cookies, STORAGE_KEY);
}

function sessionJson(cookies: AuthCookie[]): string {
  const value = cookies.find((cookie) => cookie.name === STORAGE_KEY)?.value ?? "";
  const encoded = value.startsWith("base64-") ? value.slice("base64-".length) : value;
  return stringFromBase64URL(encoded);
}

describe("tab auth storage", () => {
  it("derives the same storage key supabase-js uses for cookies", () => {
    expect(authStorageKeyFromSupabaseUrl("https://xyzcompany.supabase.co")).toBe(
      "sb-xyzcompany-auth-token",
    );
  });

  it("reads the user id from chunked auth cookies", () => {
    const cookies = cookiesForUser("user-a", "1", 24);
    expect(cookies.length).toBeGreaterThan(1);
    expect(userId(cookies)).toBe("user-a");
  });

  it("keeps tab A on user A after tab B logs in, and republishes A before a save", () => {
    const tabA = memoryStorage();
    const tabB = memoryStorage();
    let sharedCookies = cookiesForUser("user-a", "a1");

    // Both tabs start from the shared cookie only when they have no jar yet.
    const seededA = reconcileTabAuthJar({
      jar: [],
      documentCookies: sharedCookies,
      navType: "navigate",
      storageKey: STORAGE_KEY,
    });
    writeTabAuthJar(tabA, seededA);

    const seededB = reconcileTabAuthJar({
      jar: [],
      documentCookies: sharedCookies,
      navType: "navigate",
      storageKey: STORAGE_KEY,
    });
    writeTabAuthJar(tabB, seededB);

    // Tab B logs in as someone else. The server action overwrites the shared cookies.
    sharedCookies = cookiesForUser("user-b", "b1");
    const afterLoginB = reconcileTabAuthJar({
      jar: readTabAuthJar(tabB),
      documentCookies: sharedCookies,
      navType: "navigate",
      storageKey: STORAGE_KEY,
    });
    writeTabAuthJar(tabB, afterLoginB);

    // Tab A is still open. A reload must not adopt B.
    const reloadedA = reconcileTabAuthJar({
      jar: readTabAuthJar(tabA),
      documentCookies: sharedCookies,
      navType: "reload",
      storageKey: STORAGE_KEY,
    });
    writeTabAuthJar(tabA, reloadedA);

    // Tab A saves hours without reloading: the in-memory session stays A and
    // the shared cookies are put back to A before the request.
    const duringSaveA = reconcileDuringSession(
      readTabAuthJar(tabA),
      sharedCookies,
      STORAGE_KEY,
    );
    const republish = planDocumentCookieWrites(
      duringSaveA,
      sharedCookies,
      STORAGE_KEY,
      ATTRIBUTES,
    );
    expect(republish.length).toBeGreaterThan(0);
    sharedCookies = parseCookieHeader(republish.map((write) => write.split(";")[0]).join("; "));

    expect(userId(readTabAuthJar(tabA))).toBe("user-a");
    expect(userId(readTabAuthJar(tabB))).toBe("user-b");
    expect(userId(sharedCookies)).toBe("user-a");
    expect(tabA.snapshot()).not.toBe(tabB.snapshot());
  });

  it("adopts a same-tab login and a same-tab logout", () => {
    const jar = cookiesForUser("user-a");
    const loggedInAsB = reconcileTabAuthJar({
      jar,
      documentCookies: cookiesForUser("user-b"),
      navType: "navigate",
      storageKey: STORAGE_KEY,
    });
    expect(userId(loggedInAsB)).toBe("user-b");

    const loggedOut = reconcileTabAuthJar({
      jar: loggedInAsB,
      documentCookies: [],
      navType: "navigate",
      storageKey: STORAGE_KEY,
    });
    expect(loggedOut).toEqual([]);
  });

  it("keeps the tab session when another tab clears cookies and this tab reloads", () => {
    const kept = reconcileTabAuthJar({
      jar: cookiesForUser("user-a"),
      documentCookies: [],
      navType: "reload",
      storageKey: STORAGE_KEY,
    });
    expect(userId(kept)).toBe("user-a");
  });

  it("picks up a same-user token refresh from the shared cookies", () => {
    const refreshed = reconcileDuringSession(
      cookiesForUser("user-a", "old"),
      cookiesForUser("user-a", "new"),
      STORAGE_KEY,
    );
    expect(userId(refreshed)).toBe("user-a");
    expect(sessionJson(refreshed)).toContain("refresh-user-a-new");
    expect(sessionJson(refreshed)).not.toContain("refresh-user-a-old");
  });

  it("drops stale auth chunks and ignores unrelated cookies when republishing", () => {
    const jar = cookiesForUser("user-a");
    const documentCookies = [
      ...cookiesForUser("user-b"),
      { name: `${STORAGE_KEY}.0`, value: "stale-chunk" },
      { name: "ql-domain", value: "santini" },
    ];
    const writes = planDocumentCookieWrites(jar, documentCookies, STORAGE_KEY, ATTRIBUTES);
    const expired = writes.find((write) => write.startsWith(`${STORAGE_KEY}.0=`));
    expect(expired).toContain("Max-Age=0");
    expect(writes.join("\n")).not.toContain("ql-domain");
    expect(planExpiredAuthCookies(documentCookies, STORAGE_KEY, ATTRIBUTES).join("\n")).not.toContain(
      "ql-domain",
    );
  });
});

describe("browser client tab session", () => {
  const supabaseUrl = "https://project.supabase.co";
  const storageKey = authStorageKeyFromSupabaseUrl(supabaseUrl);
  let duringFetch: (url: string) => void = () => {};

  function namedCookies(userId: string, tokenSuffix: string): AuthCookie[] {
    return cookiesForUser(userId, tokenSuffix).map((cookie) => ({
      ...cookie,
      name: cookie.name.replace(STORAGE_KEY, storageKey),
    }));
  }

  function assignCookies(cookies: AuthCookie[]) {
    for (const cookie of cookies) {
      document.cookie = serializeCookie(cookie.name, cookie.value, ATTRIBUTES);
    }
  }

  function clearCookies() {
    for (const cookie of parseCookieHeader(document.cookie)) {
      document.cookie = serializeCookie(cookie.name, "", { ...ATTRIBUTES, maxAge: 0 });
    }
  }

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    clearCookies();
    duringFetch = () => {};
    delete (window as Window & { __fdmTabAuthSyncInstalled?: boolean }).__fdmTabAuthSyncInstalled;
    process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    window.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      duringFetch(url);
      return { ok: true } as Response;
    }) as typeof window.fetch;
    jest.resetModules();
  });

  it("keeps getSession on user A after another tab overwrites cookies, and restores A before fetch", async () => {
    assignCookies(namedCookies("user-a", "a1"));

    const { createClient } = await import("@/utils/supabase/client");
    const supabase = createClient();

    const first = await supabase.auth.getSession();
    expect(first.data.session?.user.id).toBe("user-a");
    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(userIdFromAuthCookies(readTabAuthJar(sessionStorage), storageKey)).toBe("user-a");
    expect(
      (supabase.auth as { broadcastChannel?: unknown }).broadcastChannel,
    ).toBeNull();

    assignCookies(namedCookies("user-b", "b1"));

    const stillA = await supabase.auth.getSession();
    expect(stillA.data.session?.user.id).toBe("user-a");

    duringFetch = (url) => {
      if (url.includes("/api/time-tracking/create")) {
        assignCookies(namedCookies("user-c", "c1"));
      }
    };
    await window.fetch("/api/time-tracking/create", { method: "POST" });

    const restored = userIdFromAuthCookies(parseCookieHeader(document.cookie), storageKey);
    expect(restored).toBe("user-a");
    expect(userIdFromAuthCookies(readTabAuthJar(sessionStorage), storageKey)).toBe("user-a");

    await supabase.auth.stopAutoRefresh();
  });

  it("adopts a login response in this tab without letting a later API call switch user", async () => {
    assignCookies(namedCookies("user-a", "a1"));
    const { createClient } = await import("@/utils/supabase/client");
    const supabase = createClient();
    expect((await supabase.auth.getSession()).data.session?.user.id).toBe("user-a");

    duringFetch = (url) => {
      if (url.includes("/login")) assignCookies(namedCookies("user-b", "b1"));
    };
    await window.fetch("/login", { method: "POST" });

    expect(userIdFromAuthCookies(readTabAuthJar(sessionStorage), storageKey)).toBe("user-b");
    expect(userIdFromAuthCookies(parseCookieHeader(document.cookie), storageKey)).toBe("user-b");
    expect((await supabase.auth.getSession()).data.session?.user.id).toBe("user-b");

    duringFetch = () => {
      assignCookies(namedCookies("user-c", "c1"));
    };
    await window.fetch("/api/time-tracking/create", { method: "POST" });

    expect(userIdFromAuthCookies(parseCookieHeader(document.cookie), storageKey)).toBe("user-b");
    expect((await supabase.auth.getSession()).data.session?.user.id).toBe("user-b");

    duringFetch = () => {
      clearCookies();
    };
    await window.fetch("/api/time-tracking/create", { method: "POST" });
    expect(userIdFromAuthCookies(parseCookieHeader(document.cookie), storageKey)).toBe("user-b");

    await window.fetch("/logout");
    expect(readTabAuthJar(sessionStorage)).toEqual([]);
    expect(userIdFromAuthCookies(parseCookieHeader(document.cookie), storageKey)).toBeNull();

    await supabase.auth.stopAutoRefresh();
  });
});
