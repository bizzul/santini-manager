import { createBrowserClient } from "@supabase/ssr";
import { COOKIE_OPTIONS } from "./cookie";

export function createClient() {
  return createBrowserClient(
    process.env.STORAGE_SUPABASE_URL!,
    process.env.STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: COOKIE_OPTIONS,
    },
  );
}
