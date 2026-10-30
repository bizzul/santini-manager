// Keep this file server-only: it imports `@/utils/supabase/server` which
// relies on `next/headers` and therefore cannot be included in a client
// bundle. Do not re-export anything from here via `lib/ui-version-settings.ts`.
import { createClient } from "@/utils/supabase/server";
import { cache } from "react";
import { UI_V2_SETTING_KEY, parseUiV2Enabled } from "./ui-version-settings";

/**
 * Server-only reader for the per-site UI v2 toggle.
 * Wrapped with `React.cache()` so repeated reads in one request cost a
 * single Supabase round-trip. Any failure falls back to `false` (UI attuale).
 */
export const getUiV2EnabledForSite = cache(
  async (siteId: string): Promise<boolean> => {
    if (!siteId) return false;

    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("site_id", siteId)
        .eq("setting_key", UI_V2_SETTING_KEY)
        .maybeSingle();

      return parseUiV2Enabled(data?.setting_value);
    } catch (error) {
      console.error("[ui-version-settings] failed to read", UI_V2_SETTING_KEY, error);
      return false;
    }
  },
);
