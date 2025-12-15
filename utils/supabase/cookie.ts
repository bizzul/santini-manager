import type { CookieOptions } from "@supabase/ssr";

// For Vercel deployment, we need to handle the domain properly
const getCookieDomain = (): string | undefined => {
  if (process.env.NODE_ENV === "production") {
    // On Vercel, use the root domain from environment variable
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    if (rootDomain && !rootDomain.includes("localhost")) {
      return `.${rootDomain}`;
    }
    // Fallback for Vercel preview deployments
    return undefined;
  }
  // Local development - don't set domain to allow cookies to work on localhost
  return undefined;
};

// Cookie options for Supabase SSR
// Note: Don't override the cookie 'name' - let Supabase manage cookie names
export const COOKIE_OPTIONS: CookieOptions = {
  domain: getCookieDomain(),
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  // maxAge is managed by Supabase based on session expiry
};
