// Keep this file server-only: it imports `@/utils/supabase/server` which
// relies on `next/headers` and therefore cannot be included in a client
// bundle. The naming convention (`.server.ts`) + the comment below are the
// only guards — do not re-export anything from here via
// `lib/command-deck-settings.ts`.
import { createClient } from "@/utils/supabase/server";
import { cache } from "react";
import {
  COMMAND_DECK_SETTING_KEY,
  parseCommandDeckEnabled,
} from "./command-deck-settings";

/**
 * Server-only reader for the per-site Command Deck toggle.
 *
 * Lives in a dedicated `.server.ts` file (with the `"server-only"` import
 * marker) so it can never be bundled into a client component by mistake —
 * the client-safe constant + parser live in `lib/command-deck-settings.ts`.
 *
 * Wrapped with `React.cache()` so that a single request that reads the flag
 * from both the site layout and the `/command-deck` page only triggers one
 * Supabase round-trip.
 */
export const getCommandDeckEnabledForSite = cache(
  async (siteId: string): Promise<boolean> => {
    if (!siteId) return false;

    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("site_id", siteId)
        .eq("setting_key", COMMAND_DECK_SETTING_KEY)
        .maybeSingle();

      return parseCommandDeckEnabled(data?.setting_value);
    } catch (error) {
      // Never break a page render if the settings table is unreachable.
      console.error(
        "[command-deck-settings] failed to read",
        COMMAND_DECK_SETTING_KEY,
        error,
      );
      return false;
    }
  },
);
