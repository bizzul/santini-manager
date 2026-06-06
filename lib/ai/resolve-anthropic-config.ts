import { createClient } from "@/utils/supabase/server";
import { cache } from "react";

export interface AnthropicRuntimeConfig {
  apiKey: string;
  model: string;
  source: "database" | "environment";
}

const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-sonnet-latest";

/**
 * Risolve la configurazione Anthropic per un site con priorita':
 * 1) chiave salvata dall'admin in site_ai_settings (solo provider anthropic o chiave sk-ant-)
 * 2) fallback process.env.ANTHROPIC_API_KEY
 *
 * Usato esclusivamente da route server-side (es. /api/documenti/extract).
 */
export const resolveAnthropicConfigForSite = cache(
  async (siteId: string): Promise<AnthropicRuntimeConfig | null> => {
    const supabase = await createClient();

    const { data: settings } = await supabase
      .from("site_ai_settings")
      .select("ai_provider, ai_model, ai_api_key")
      .eq("site_id", siteId)
      .maybeSingle();

    const dbKey = settings?.ai_api_key?.trim() || null;
    const isAnthropicProvider = settings?.ai_provider === "anthropic";
    const isAnthropicKey = dbKey?.startsWith("sk-ant-") ?? false;

    if (dbKey && (isAnthropicProvider || isAnthropicKey)) {
      return {
        apiKey: dbKey,
        model: settings?.ai_model || DEFAULT_ANTHROPIC_MODEL,
        source: "database",
      };
    }

    const envKey = process.env.ANTHROPIC_API_KEY?.trim() || null;
    if (envKey) {
      return {
        apiKey: envKey,
        model:
          isAnthropicProvider && settings?.ai_model
            ? settings.ai_model
            : DEFAULT_ANTHROPIC_MODEL,
        source: "environment",
      };
    }

    return null;
  },
);

export const ANTHROPIC_CONFIG_MISSING_MESSAGE =
  "Configura la chiave Anthropic in Impostazioni > AI & Voice";
