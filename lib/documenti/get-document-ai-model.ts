import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import {
  ANTHROPIC_DEFAULT_MODEL,
  resolveAnthropicModelId,
} from "@/lib/ai/anthropic-models";
import type { AiRuntimeConfig } from "@/lib/ai/resolve-ai-config";

const UI_MODEL_ALIASES: Record<string, string> = {
  "GPT-4o mini": "gpt-4o-mini",
  "GPT-4o": "gpt-4o",
};

/**
 * Normalizza il nome modello: converte etichette UI e ID deprecati in ID API validi.
 */
export function normalizeAiModelId(model: string, provider: string): string {
  const trimmed = model.trim();

  if (provider === "anthropic") {
    if (UI_MODEL_ALIASES[trimmed]) {
      return UI_MODEL_ALIASES[trimmed];
    }
    if (!trimmed.startsWith("claude-")) {
      return ANTHROPIC_DEFAULT_MODEL;
    }
    return resolveAnthropicModelId(trimmed);
  }

  if (UI_MODEL_ALIASES[trimmed]) {
    return UI_MODEL_ALIASES[trimmed];
  }
  if (provider === "openai" && trimmed.startsWith("claude-")) {
    return "gpt-4o-mini";
  }
  return trimmed;
}

/**
 * Crea il modello Vercel AI SDK dal provider configurato nel pannello admin.
 * La API key resta solo lato server.
 */
export function createModelFromAiConfig(config: AiRuntimeConfig) {
  const modelId = normalizeAiModelId(config.model, config.provider);

  switch (config.provider) {
    case "anthropic":
      return createAnthropic({ apiKey: config.apiKey })(modelId);
    case "openai":
      return createOpenAI({ apiKey: config.apiKey })(modelId);
    default:
      throw new Error(
        `Provider AI non supportato per documenti: ${config.provider}. Usa Anthropic o OpenAI.`,
      );
  }
}
