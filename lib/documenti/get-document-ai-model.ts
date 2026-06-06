import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { AiRuntimeConfig } from "@/lib/ai/resolve-ai-config";

/**
 * Crea il modello Vercel AI SDK dal provider configurato nel pannello admin.
 * La API key resta solo lato server.
 */
export function createModelFromAiConfig(config: AiRuntimeConfig) {
  switch (config.provider) {
    case "anthropic":
      return createAnthropic({ apiKey: config.apiKey })(config.model);
    case "openai":
    default:
      return createOpenAI({ apiKey: config.apiKey })(config.model);
  }
}
