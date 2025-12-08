import { createBrowserClient } from "@supabase/ssr";

// Singleton instance to prevent multiple clients from being created
// This avoids multiple simultaneous token refresh attempts that cause 429 errors
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

// In-memory lock for environments without Web Locks API
let refreshLock: Promise<void> | null = null;

/**
 * Custom lock function to prevent concurrent token refresh attempts
 * Uses Web Locks API if available, falls back to in-memory lock
 */
async function acquireLock<R>(
  name: string,
  acquireTimeout: number,
  callback: () => Promise<R>,
): Promise<R> {
  // Try Web Locks API first (modern browsers)
  if (typeof navigator !== "undefined" && navigator.locks) {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), acquireTimeout);

      navigator.locks.request(
        name,
        { signal: controller.signal },
        async () => {
          clearTimeout(timeoutId);
          try {
            const result = await callback();
            resolve(result);
          } catch (err) {
            reject(err);
          }
        },
      ).catch(reject);
    });
  }

  // Fallback: simple in-memory lock for SSR or older browsers
  if (refreshLock) {
    await refreshLock;
  }

  let releaseLock: () => void;
  refreshLock = new Promise((resolve) => {
    releaseLock = resolve;
  });

  try {
    return await callback();
  } finally {
    releaseLock!();
    refreshLock = null;
  }
}

export function createClient() {
  // Return existing instance if available (singleton pattern)
  if (supabaseClient) {
    return supabaseClient;
  }

  const COOKIE_NAME = process.env.COOKIE_NAME ?? "reactive-app:session";

  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Tell Supabase SSR this is a singleton - prevents duplicate instances
      isSingleton: true,
      cookieOptions: {
        name: COOKIE_NAME,
        domain: process.env.NODE_ENV === "production" ? undefined : "localhost",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        httpOnly: false,
        path: "/",
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        // Use custom lock to prevent concurrent token refresh
        lock: acquireLock,
      },
      global: {
        headers: {
          "X-Client-Info": "supabase-js-browser",
        },
      },
    },
  );

  return supabaseClient;
}
