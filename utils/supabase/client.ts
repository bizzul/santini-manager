import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const COOKIE_NAME = process.env.COOKIE_NAME ?? "reactive-app:session";

  return createBrowserClient(
    process.env.STORAGE_SUPABASE_URL!,
    process.env.STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
}
