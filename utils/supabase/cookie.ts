import type { CookieOptionsWithName } from "@supabase/ssr";
import { DEFAULT_COOKIE_OPTIONS } from "@supabase/ssr";

const COOKIE_NAME = process.env.COOKIE_NAME ?? "reactive-app:session";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? ".localhost";

export const COOKIE_OPTIONS: CookieOptionsWithName = {
  ...DEFAULT_COOKIE_OPTIONS,
  name: COOKIE_NAME,
  domain: COOKIE_DOMAIN,
};