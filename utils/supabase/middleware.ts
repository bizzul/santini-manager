import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { COOKIE_OPTIONS } from "./cookie";

const COOKIE_NAME = process.env.COOKIE_NAME ?? "reactive-app:session";

// Use consistent environment variables with fallback
// This ensures client and server always use the same Supabase instance
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function updateSession(request: NextRequest) {
  // OPTIMIZATION: Check if route is public BEFORE making any auth calls
  // This prevents unnecessary token refresh requests that cause 429 errors
  const publicRoutes = [
    "/",
    "/home",
    "/login",
    "/setup-organization",
    "/unauthorized",
    "/favicon.ico",
    "/api/auth/callback",
    "/api/auth/refresh",
    "/auth/forgot-password",
    "/auth/reset-password",
  ];
  
  const pathname = request.nextUrl.pathname;
  const isPublic =
    publicRoutes.some((route) => pathname === route) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/confirm") ||
    pathname.match(/\.[a-zA-Z0-9]+$/); // static files (images, fonts, etc.)

  // Skip auth check entirely for public routes - no Supabase call needed
  if (isPublic) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookieOptions: COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((c) => request.cookies.set(c));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach((c) => supabaseResponse.cookies.set(c));
        },
      },
    },
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user) {
    // no user, redirect to login page
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const response = NextResponse.redirect(url);

    // Ensure Supabase cookies are set even on redirect
    const supacookies = supabaseResponse.cookies.getAll();
    supacookies.forEach((c) => response.cookies.set(c));

    return response;
  }

  if (error) {
    try {
      const cookieStore = await cookies();
      const hasCookie = cookieStore.has(COOKIE_NAME);

      // corrupted session - delete the cookie
      if (hasCookie) {
        const cookiesToDelete = [
          `${COOKIE_NAME}`,
          `${COOKIE_NAME}-code-verifier`,
        ];

        const res = NextResponse.next({ request });
        const supacookies = supabaseResponse.cookies.getAll();
        supacookies.forEach((c) => res.cookies.set(c));
        cookiesToDelete.forEach((c) => res.cookies.delete(c));
        return res;
      }
    } catch {
      // If cookies() fails, continue without cookie cleanup
      // This can happen in certain edge cases, especially on Vercel
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!
  return supabaseResponse;
}
