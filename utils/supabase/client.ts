import { createBrowserClient } from "@supabase/ssr";

// Singleton instance to prevent multiple clients from being created
// This avoids multiple simultaneous token refresh attempts that cause 429 errors
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

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
