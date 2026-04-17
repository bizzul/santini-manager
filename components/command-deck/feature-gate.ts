/**
 * Feature gate for the Command Deck.
 *
 * During the alpha demo phase we want the immersive navigation live only
 * on the "copia" spaces (e.g. `santini-copia`). Production spaces (e.g.
 * `santini`) must see no launcher button and receive a `notFound()` when
 * they try to hit `/sites/{domain}/command-deck` directly.
 *
 * Policy:
 *  1. If `NEXT_PUBLIC_COMMAND_DECK_DOMAINS` is set, it is parsed as a
 *     comma-separated allowlist (exact match, case-insensitive).
 *     This is the recommended way to scale the gate later without code
 *     changes — just flip the env variable in Vercel.
 *  2. Otherwise, falls back to a regex matching any subdomain that
 *     contains the literal substring "copia" (case-insensitive).
 *     This is sufficient for the current alpha demo naming convention.
 *
 * The function is safe to call from both server and client code.
 */

const ALPHA_DEMO_PATTERN = /copia/i;

function parseAllowlist(raw: string | undefined): Set<string> | null {
  if (!raw) return null;
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  if (parts.length === 0) return null;
  return new Set(parts);
}

export function isCommandDeckEnabled(
  domain: string | null | undefined,
): boolean {
  if (!domain) return false;

  const allowlist = parseAllowlist(
    process.env.NEXT_PUBLIC_COMMAND_DECK_DOMAINS,
  );
  if (allowlist) {
    return allowlist.has(domain.toLowerCase());
  }

  return ALPHA_DEMO_PATTERN.test(domain);
}
