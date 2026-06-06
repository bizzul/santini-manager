import type { AiProvider } from "@/lib/ai/get-site-ai-config";
import type { AiRuntimeConfig } from "@/lib/ai/resolve-ai-config";

export const DOCUMENT_AI_CONFIG_MISSING_MESSAGE =
  "Configura la chiave API in Impostazioni > AI & Voice > Crea documenti";

const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: "claude-3-5-sonnet-latest",
  openai: "gpt-4o-mini",
  google: "gemini-1.5-flash",
};

export interface SiteAiSettingsRow {
  ai_provider?: string | null;
  ai_model?: string | null;
  ai_api_key?: string | null;
  documenti_ai_provider?: string | null;
  documenti_ai_model?: string | null;
  documenti_ai_api_key?: string | null;
}

function resolveFromProviderKeyModel(
  provider: AiProvider,
  apiKey: string,
  model: string | null | undefined,
  source: AiRuntimeConfig["source"],
): AiRuntimeConfig {
  return {
    provider,
    apiKey,
    model: model || DEFAULT_MODELS[provider] || DEFAULT_MODELS.openai,
    source,
  };
}

function getEnvKeyForProvider(provider: AiProvider): string | null {
  if (provider === "anthropic") {
    return process.env.ANTHROPIC_API_KEY?.trim() || null;
  }
  return process.env.OPENAI_API_KEY?.trim() || null;
}

/**
 * Logica pura di risoluzione config documenti (testabile senza DB).
 * Priorita': documenti_ai_* > ai_* globali > env.
 */
export function resolveDocumentAiFromSettings(
  settings: SiteAiSettingsRow | null | undefined,
): AiRuntimeConfig | null {
  const docProvider = settings?.documenti_ai_provider as AiProvider | undefined;
  const docKey = settings?.documenti_ai_api_key?.trim() || null;
  const docModel = settings?.documenti_ai_model;

  if (docKey && docProvider) {
    return resolveFromProviderKeyModel(
      docProvider,
      docKey,
      docModel,
      "database",
    );
  }

  if (docKey) {
    const provider =
      (settings?.ai_provider as AiProvider) || "openai";
    return resolveFromProviderKeyModel(
      docProvider || provider,
      docKey,
      docModel || settings?.ai_model,
      "database",
    );
  }

  const globalProvider = (settings?.ai_provider as AiProvider) || "openai";
  const globalKey = settings?.ai_api_key?.trim() || null;
  const globalModel = settings?.ai_model;

  if (globalKey) {
    const provider = docProvider || globalProvider;
    const model = docModel || globalModel;
    return resolveFromProviderKeyModel(provider, globalKey, model, "database");
  }

  const providerForEnv = docProvider || globalProvider;
  const envKey = getEnvKeyForProvider(providerForEnv);
  if (envKey) {
    return resolveFromProviderKeyModel(
      providerForEnv,
      envKey,
      docModel || globalModel,
      "environment",
    );
  }

  const fallbackAnthropic = process.env.ANTHROPIC_API_KEY?.trim();
  if (fallbackAnthropic) {
    return {
      provider: "anthropic",
      apiKey: fallbackAnthropic,
      model: docModel || DEFAULT_MODELS.anthropic,
      source: "environment",
    };
  }

  const fallbackOpenai = process.env.OPENAI_API_KEY?.trim();
  if (fallbackOpenai) {
    return {
      provider: "openai",
      apiKey: fallbackOpenai,
      model: docModel || globalModel || DEFAULT_MODELS.openai,
      source: "environment",
    };
  }

  return null;
}
