/**
 * Client-safe constants and pure parser for the per-site "UI v2" toggle
 * (restyling visivo FDM, ottobre 2026).
 *
 * IMPORTANT: do NOT import anything from `@/utils/supabase/server` here.
 * The server-only reader lives in `lib/ui-version-settings.server.ts`.
 *
 * Attivazione per spazio: riga in `site_settings` con
 *   setting_key   = 'ui_v2_enabled'
 *   setting_value = true
 * Assente / false = interfaccia attuale, invariata.
 */

export const UI_V2_SETTING_KEY = "ui_v2_enabled";

/** Valore dell'attributo `data-ui` su <html> quando il flag è attivo. */
export const UI_V2_DATA_ATTRIBUTE_VALUE = "v2";

/**
 * `site_settings.setting_value` è JSONB: accetta `true`, `"true"` o
 * `{ enabled: true }`, come gli altri toggle per spazio.
 */
export function parseUiV2Enabled(value: unknown): boolean {
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
