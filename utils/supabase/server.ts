import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { COOKIE_OPTIONS } from "./cookie";

// Use consistent environment variables with fallback
// This ensures client and server always use the same Supabase instance
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.STORAGE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY!;

export async function createClient() {
  try {
    const cookieStore = await cookies();

    return createServerClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        cookieOptions: COOKIE_OPTIONS,
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch (e) {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
              console.log("[Supabase] setAll cookie error (expected in Server Components):", e);
            }
          },
        },
      },
    );
  } catch (error) {
    // If cookies() fails (e.g., during static generation), create a client without cookies
    console.warn("[Supabase] cookies() failed, creating client without cookies. This may cause auth issues!", error);
    return createServerClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        cookieOptions: COOKIE_OPTIONS,
        cookies: {
          getAll() {
            return [];
          },
          setAll() {
            // No-op for static generation contexts
          },
        },
      },
    );
  }
}

export function createServiceClient() {
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    {
      cookieOptions: COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // No-op for service client
        },
      },
    },
  );
}

/**
 * Anon client authenticated by an explicit access token instead of cookies.
 *
 * The token is sent as the `Authorization` header on every PostgREST call, so
 * RLS runs as that user (`auth.uid()` matches) and `auth.getUser(token)`
 * validates the same identity. This is how `/api/*` routes trust the per-tab
 * token sent by the browser rather than the shared cookie jar on a shared PC.
 * Never log the token.
 */
export function createTokenClient(accessToken: string) {
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookieOptions: COOKIE_OPTIONS,
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // No-op: this client is stateless and token-scoped.
        },
      },
    },
  );
}
