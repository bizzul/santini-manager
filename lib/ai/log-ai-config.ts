import { APICallError } from "@ai-sdk/provider";
import type { AiRuntimeConfig } from "@/lib/ai/resolve-ai-config";
import { logger } from "@/lib/logger";

const log = logger.scope("DocumentiGenerate");

function apiKeyPrefix(key: string): string {
  if (key.startsWith("sk-ant-")) return "sk-ant-...";
  if (key.startsWith("sk-proj-")) return "sk-proj-...";
  if (key.startsWith("sk-")) return "sk-...";
  return `${key.slice(0, Math.min(8, key.length))}...`;
}

function keySourceLabel(source: AiRuntimeConfig["source"]): string {
  return source === "database" ? "pannello admin" : "variabile d'ambiente";
}

export function logDocumentAiConfig(
  config: AiRuntimeConfig,
  context?: string,
): void {
  const key = config.apiKey;
  log.info("Config AI documenti", {
    context: context ?? "generate",
    provider: config.provider,
    model: config.model,
    apiKeyPresent: Boolean(key),
    apiKeyLength: key?.length ?? 0,
    apiKeyPrefix: key ? apiKeyPrefix(key) : null,
    keySource: keySourceLabel(config.source),
    endpoint:
      config.provider === "anthropic"
        ? "https://api.anthropic.com/v1/messages"
        : "https://api.openai.com/v1/chat/completions",
  });
}

function findApiCallError(error: unknown): APICallError | null {
  let current: unknown = error;
  const seen = new Set<unknown>();

  while (current != null && !seen.has(current)) {
    seen.add(current);
    if (APICallError.isInstance(current)) {
      return current;
    }
    current =
      current instanceof Error
        ? current.cause
        : typeof current === "object" && current !== null && "cause" in current
          ? (current as { cause?: unknown }).cause
          : undefined;
  }

  return null;
}

export function logDocumentAiError(
  error: unknown,
  config: AiRuntimeConfig,
  context?: string,
): void {
  const apiError = findApiCallError(error);

  log.error("Errore provider AI", {
    context: context ?? "generate",
    provider: config.provider,
    model: config.model,
    statusCode: apiError?.statusCode,
    url: apiError?.url,
    responseBody: apiError?.responseBody,
    providerData: apiError?.data,
    message: apiError?.message ?? (error instanceof Error ? error.message : String(error)),
  });
}
