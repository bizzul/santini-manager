import { createClient } from "@/utils/supabase/server";
import { cache } from "react";
import type { AiProvider } from "@/lib/ai/get-site-ai-config";
import {
  DOCUMENT_AI_CONFIG_MISSING_MESSAGE,
  resolveDocumentAiFromSettings,
} from "@/lib/ai/resolve-document-ai-config";

export { DOCUMENT_AI_CONFIG_MISSING_MESSAGE };

export interface AiRuntimeConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  source: "database" | "environment";
}

const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: "claude-3-5-sonnet-latest",
  openai: "gpt-4o-mini",
  google: "gemini-1.5-flash",
};

export const AI_CONFIG_MISSING_MESSAGE =
  "Configura la chiave API in Impostazioni > AI & Voice";

/**
 * Risolve provider, modello e chiave per un site.
 * Priorita': (a) site_ai_settings, (b) env ANTHROPIC_API_KEY / OPENAI_API_KEY.
 */
export const resolveAiConfigForSite = cache(
  async (siteId: string): Promise<AiRuntimeConfig | null> => {
    const supabase = await createClient();

    const { data: settings } = await supabase
      .from("site_ai_settings")
      .select("ai_provider, ai_model, ai_api_key")
      .eq("site_id", siteId)
      .maybeSingle();

    const provider = (settings?.ai_provider as AiProvider) || "openai";
    const dbKey = settings?.ai_api_key?.trim() || null;
    const model =
      settings?.ai_model || DEFAULT_MODELS[provider] || DEFAULT_MODELS.openai;

    if (dbKey) {
      return { provider, apiKey: dbKey, model, source: "database" };
    }

    const envKey =
      provider === "anthropic"
        ? process.env.ANTHROPIC_API_KEY?.trim()
        : process.env.OPENAI_API_KEY?.trim();

    if (envKey) {
      return { provider, apiKey: envKey, model, source: "environment" };
    }

    const fallbackAnthropic = process.env.ANTHROPIC_API_KEY?.trim();
    if (fallbackAnthropic) {
      return {
        provider: "anthropic",
        apiKey: fallbackAnthropic,
        model: DEFAULT_MODELS.anthropic,
        source: "environment",
      };
    }

    const fallbackOpenai = process.env.OPENAI_API_KEY?.trim();
    if (fallbackOpenai) {
      return {
        provider: "openai",
        apiKey: fallbackOpenai,
        model: DEFAULT_MODELS.openai,
        source: "environment",
      };
    }

    return null;
  },
);

/**
 * Config AI per generazione/analisi documenti.
 * Priorita': documenti_ai_* > ai_* globali > env.
 */
export const resolveAiConfigForDocuments = cache(
  async (siteId: string): Promise<AiRuntimeConfig | null> => {
    const supabase = await createClient();

    const { data: settings } = await supabase
      .from("site_ai_settings")
      .select(
        "ai_provider, ai_model, ai_api_key, documenti_ai_provider, documenti_ai_model, documenti_ai_api_key",
      )
      .eq("site_id", siteId)
      .maybeSingle();

    return resolveDocumentAiFromSettings(settings);
  },
);
