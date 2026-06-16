// Server-only reader for persisted diagram layouts. Imports the Supabase
// server client (uses next/headers) so it must never be bundled client-side.
// Client-safe types/parser live in `lib/diagram-layouts.ts`.
import { createClient } from "@/utils/supabase/server";
import { cache } from "react";
import {
  DEFAULT_DIAGRAM_LAYOUTS,
  diagramLayoutsKey,
  parseDiagramLayouts,
  type DiagramKey,
  type DiagramLayoutsSetting,
} from "./diagram-layouts";

/**
 * Reads the saved layouts for a given site + diagram. Falls back to empty
 * defaults so a page render never breaks for sites without the setting.
 */
export const getDiagramLayoutsForSite = cache(
  async (
    siteId: string,
    diagramKey: DiagramKey | string,
  ): Promise<DiagramLayoutsSetting> => {
    if (!siteId) return { ...DEFAULT_DIAGRAM_LAYOUTS };

    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("site_id", siteId)
        .eq("setting_key", diagramLayoutsKey(diagramKey))
        .maybeSingle();

      return parseDiagramLayouts(data?.setting_value);
    } catch (error) {
      console.error("[diagram-layouts] failed to read", diagramKey, error);
      return { ...DEFAULT_DIAGRAM_LAYOUTS };
    }
  },
);
