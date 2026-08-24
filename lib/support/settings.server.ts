import { createClient } from "@/utils/supabase/server";
import { cache } from "react";
import {
  SUPPORT_BOT_SETTING_KEY,
  parseSupportBotEnabled,
} from "./settings";

export const getSupportBotEnabledForSite = cache(
  async (siteId: string): Promise<boolean> => {
    if (!siteId) return false;

    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("site_id", siteId)
        .eq("setting_key", SUPPORT_BOT_SETTING_KEY)
        .maybeSingle();

      return parseSupportBotEnabled(data?.setting_value);
    } catch (error) {
      console.error(
        "[support-settings] failed to read",
        SUPPORT_BOT_SETTING_KEY,
        error,
      );
      return false;
    }
  },
);
