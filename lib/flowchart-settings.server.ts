// Keep this file server-only: it imports `@/utils/supabase/server` which
// relies on `next/headers` and therefore cannot be included in a client
// bundle. The client-safe constants/types/parser live in
// `lib/flowchart-settings.ts`.
import { createClient } from "@/utils/supabase/server";
import { cache } from "react";
import {
    DEFAULT_FLOWCHART_SETTINGS,
    FLOWCHART_SETTING_KEY,
    parseFlowchartSettings,
    type SiteFlowchartSettings,
} from "./flowchart-settings";

/**
 * Server-only reader for the per-site home flowchart settings.
 *
 * Wrapped with `React.cache()` so multiple reads in the same request only
 * trigger one Supabase round-trip. Always falls back to safe defaults
 * (disabled) so a page render never breaks for sites without the setting.
 */
export const getFlowchartSettingsForSite = cache(
    async (siteId: string): Promise<SiteFlowchartSettings> => {
        if (!siteId) return { ...DEFAULT_FLOWCHART_SETTINGS };

        try {
            const supabase = await createClient();
            const { data } = await supabase
                .from("site_settings")
                .select("setting_value")
                .eq("site_id", siteId)
                .eq("setting_key", FLOWCHART_SETTING_KEY)
                .maybeSingle();

            return parseFlowchartSettings(data?.setting_value);
        } catch (error) {
            console.error(
                "[flowchart-settings] failed to read",
                FLOWCHART_SETTING_KEY,
                error,
            );
            return { ...DEFAULT_FLOWCHART_SETTINGS };
        }
    },
);
