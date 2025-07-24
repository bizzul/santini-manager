import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_OPTIONS } from './cookie'



const COOKIE_NAME = process.env.COOKIE_NAME ?? "reactive-auth:session";


export async function updateSession(request: NextRequest) {

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((c) => request.cookies.set(c));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach((c) => supabaseResponse.cookies.set(c));
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }


  if (error || !user) {
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
  return supabaseResponse
}