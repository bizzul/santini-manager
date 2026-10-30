import type { User } from "@supabase/supabase-js";
import { createClient, createTokenClient } from "./server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

type RequestLike = { headers: { get(name: string): string | null } };

/**
 * Extract the Bearer token from the `Authorization` header, or null.
 *
 * The browser attaches this tab's Supabase access token (see `apiFetch` and the
 * global fetch wrapper). It is the per-tab identity, isolated from the shared
 * cookie jar. Never log the returned value.
 */
export function bearerTokenFromRequest(request: RequestLike): string | null {
  const header =
    request.headers.get("authorization") ??
    request.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token ? token : null;
}

export type ApiAuth = {
  supabase: ServerSupabaseClient;
  user: User | null;
  /** "token" when the identity came from the per-tab Bearer token. */
  source: "token" | "cookie";
  accessToken: string | null;
};

/**
 * Resolve the identity of an `/api` request.
 *
 * Prefers the per-tab Bearer token (genuinely isolated per browser tab): when
 * present and valid, both the returned `user` and the Supabase client are
 * scoped to that token, so RLS and the resolved identity match. Falls back to
 * the shared cookie session otherwise, preserving the previous behaviour for
 * requests that do not carry the header. Never logs the token.
 */
export async function resolveApiAuth(request: RequestLike): Promise<ApiAuth> {
  const token = bearerTokenFromRequest(request);
  if (token) {
    const supabase = createTokenClient(token);
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);
      if (user && !error) {
        return { supabase, user, source: "token", accessToken: token };
      }
    } catch {
      // Invalid/expired token: fall through to the cookie session.
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user, source: "cookie", accessToken: null };
}
