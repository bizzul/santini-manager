import type { CookieOptionsWithName } from "@supabase/ssr";
import { DEFAULT_COOKIE_OPTIONS } from "@supabase/ssr";

const COOKIE_NAME = process.env.COOKIE_NAME ?? "reactive-app:session";

// For Vercel deployment, we need to handle the domain properly
const getCookieDomain = () => {
  if (process.env.NODE_ENV === "production") {
    // On Vercel, use the root domain from environment variable
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    if (rootDomain && !rootDomain.includes("localhost")) {
      return `.${rootDomain}`;
    }
    // Fallback for Vercel preview deployments
    return undefined;
  }
  // Local development
  return ".localhost";
};

export const COOKIE_OPTIONS: CookieOptionsWithName = {
  ...DEFAULT_COOKIE_OPTIONS,
  name: COOKIE_NAME,
  domain: getCookieDomain(),
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  httpOnly: true,
  path: "/",
};
