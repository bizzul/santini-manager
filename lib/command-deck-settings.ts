/**
 * Client-safe constants and pure parsers for the per-site Command Deck
 * toggle.
 *
 * IMPORTANT: do NOT import anything from `@/utils/supabase/server` here —
 * this module is bundled into client components (e.g. the admin modal)
 * that only need the setting key name and the value parser.
 *
 * The server-only reader (`getCommandDeckEnabledForSite`) lives in
 * `lib/command-deck-settings.server.ts`.
 */

/**
 * Key used to store/read the toggle in `site_settings`.
 * Stays aligned with the pattern used by `support_bot_enabled`.
 */
export const COMMAND_DECK_SETTING_KEY = "command_deck_enabled";

/**
 * Coerces any persisted value into a strict boolean. `site_settings.setting_value`
 * is a JSONB column, so in theory we could get `true`, `"true"`, an
 * object `{ enabled: true }`, or `null`. This normalizer makes every caller
 * forward-compatible with any of those shapes.
 */
export function parseCommandDeckEnabled(value: unknown): boolean {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  if (
    value &&
    typeof value === "object" &&
    "enabled" in (value as Record<string, unknown>)
  ) {
    return Boolean((value as { enabled?: unknown }).enabled);
  }
  return false;
}
