import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { COOKIE_OPTIONS } from "./cookie";

const COOKIE_NAME = process.env.COOKIE_NAME ?? "reactive-auth:session";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.STORAGE_SUPABASE_URL!,
    process.env.STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Allow unauthenticated access to public routes
  const publicRoutes = [
    "/",
    "/home",
    "/login",
    "/setup-organization",
    "/unauthorized",
    "/favicon.ico",
  ];
  const isPublic =
    publicRoutes.some((route) => request.nextUrl.pathname === route) ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/static") ||
    request.nextUrl.pathname.match(/\.[a-zA-Z0-9]+$/); // static files

  if (
    !user &&
    !isPublic &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/confirm")
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (error || !user) {
    try {
      const cookieStore = await cookies();
      const hasCookie = cookieStore.has(COOKIE_NAME);

      // no user or corrupted session(?). Check if there's a session cookie. If yes, make sure to delete it.
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
      // This can happen in certain edge cases
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
  console.log("user", user);
  return supabaseResponse;
}
