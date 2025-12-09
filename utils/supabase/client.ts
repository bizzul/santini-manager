import { createBrowserClient } from "@supabase/ssr";
import { COOKIE_OPTIONS } from "./cookie";

// Singleton instance to prevent multiple clients from being created
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // Return existing instance if available (singleton pattern)
  if (supabaseClient) {
    return supabaseClient;
  }

  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: true,
      cookieOptions: COOKIE_OPTIONS,
      auth: {
        // Enable auto refresh to keep session alive
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
