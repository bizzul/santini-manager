import { createBrowserClient } from "@supabase/ssr";
import { COOKIE_OPTIONS } from "./cookie";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: COOKIE_OPTIONS,
    },
  );
}
