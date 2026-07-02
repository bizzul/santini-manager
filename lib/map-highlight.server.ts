/**
 * Server-only reader for the per-site dashboard map highlight countries.
 *
 * Lives in a dedicated `.server.ts` file (imports `@/utils/supabase/server`)
 * so it never gets bundled into a client component. Client-safe constants +
 * parser live in `lib/map-highlight.ts`.
 */
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import {
  DEFAULT_HIGHLIGHT_COUNTRIES,
  MAP_HIGHLIGHT_SETTING_KEY,
  parseHighlightCountries,
} from "./map-highlight";

export const getSiteHighlightCountries = cache(
  async (siteId: string): Promise<string[]> => {
    if (!siteId) return [...DEFAULT_HIGHLIGHT_COUNTRIES];

    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("site_id", siteId)
        .eq("setting_key", MAP_HIGHLIGHT_SETTING_KEY)
        .maybeSingle();

      return parseHighlightCountries(data?.setting_value);
    } catch (error) {
      console.error(
        "[map-highlight] failed to read",
        MAP_HIGHLIGHT_SETTING_KEY,
        error,
      );
      return [...DEFAULT_HIGHLIGHT_COUNTRIES];
    }
  },
);
