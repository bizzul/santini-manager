import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { COOKIE_OPTIONS } from "./cookie";

export async function createClient() {
  try {
    const cookieStore = await cookies();

    return createServerClient(
      process.env.STORAGE_SUPABASE_URL!,
      process.env.STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      },
    );
  } catch (error) {
    // If cookies() fails (e.g., during static generation), create a client without cookies
    return createServerClient(
      process.env.STORAGE_SUPABASE_URL!,
      process.env.STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    process.env.STORAGE_SUPABASE_URL!,
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY!,
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
