/**
 * Feature gate for the Command Deck.
 *
 * Source of truth since v2.5: the `site_settings.command_deck_enabled`
 * boolean toggle, manageable per-site by superadmins from the admin site
 * edit page ("Abilita 3D Desk View" card).
 *
 * Previous iterations gated the feature via a subdomain regex (`/copia/i`)
 * or via the `NEXT_PUBLIC_COMMAND_DECK_DOMAINS` env allowlist. Both are now
 * retired in favour of the persistent per-space flag, which gives the
 * admin full control at runtime without a redeploy.
 *
 * - Client callers should receive the boolean already resolved (e.g. from
 *   the hydrated React Query cache or from a server prop) and pass it into
 *   `isCommandDeckEnabled(flag)`.
 * - Server callers should use `getCommandDeckEnabledForSite(siteId)` from
 *   `lib/command-deck-settings.ts` directly — it is `React.cache()`-wrapped
 *   so repeated calls during a single render are free.
 */

/**
 * Pure predicate. Kept as a named export so call sites read clearly:
 *
 *   if (!isCommandDeckEnabled(siteData?.commandDeckEnabled)) return null;
 *
 * Tolerates `null` / `undefined` (treated as disabled), matching the
 * behaviour of the server reader which coerces missing rows to `false`.
 */
export function isCommandDeckEnabled(
  enabled: boolean | null | undefined,
): boolean {
  return enabled === true;
}
