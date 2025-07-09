// middleware.js
import {
  getSession,
  withMiddlewareAuthRequired,
} from "@auth0/nextjs-auth0/edge";
import { NextRequest, NextResponse } from "next/server";

// export default withMiddlewareAuthRequired();

export default withMiddlewareAuthRequired(async function middleware(
  req: NextRequest
) {
  const res = NextResponse.next();
  const user = await getSession(req, res);

  // If user is not authenticated and trying to access any protected route
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - login (login page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!login|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
