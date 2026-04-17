import { NextRequest, NextResponse } from "next/server";

/**
 * Gate for all handlers under `app/api/debug/**`.
 *
 * Rules:
 * - In development (NODE_ENV !== 'production'): always allowed.
 * - In production: allowed only if `DEBUG_API_SECRET` is configured AND the
 *   `Authorization: Bearer <secret>` header (or `?secret=...` query) matches.
 *
 * When access is denied, a 404 response is returned (not 401/403) to avoid
 * advertising the existence of debug endpoints to external scanners.
 *
 * Usage (in any `app/api/debug/**\/route.ts`):
 *
 *   export async function GET(request: NextRequest) {
 *     const denied = assertDebugAccess(request);
 *     if (denied) return denied;
 *     // ...existing handler logic
 *   }
 */
export function assertDebugAccess(request: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  const secret = process.env.DEBUG_API_SECRET;
  if (!secret) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const auth = request.headers.get("authorization");
  const fromHeader = auth === `Bearer ${secret}`;
  const fromQuery = request.nextUrl.searchParams.get("secret") === secret;

  if (fromHeader || fromQuery) {
    return null;
  }

  return new NextResponse("Not Found", { status: 404 });
}
