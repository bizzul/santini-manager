const ANTHROPIC_KEY_PATTERN = /^sk-ant-[a-zA-Z0-9_-]+$/;
const OPENAI_KEY_PATTERN = /^sk-[a-zA-Z0-9_-]+$/;

export function isValidAnthropicApiKey(key: string): boolean {
  return ANTHROPIC_KEY_PATTERN.test(key.trim());
}

export function isValidOpenAiApiKey(key: string): boolean {
  const trimmed = key.trim();
  return OPENAI_KEY_PATTERN.test(trimmed) && !trimmed.startsWith("sk-ant-");
}

export function validateAiApiKeyForProvider(
  provider: string,
  key: string,
): { valid: boolean; message?: string } {
  const trimmed = key.trim();
  if (!trimmed) {
    return { valid: false, message: "La API key non puo' essere vuota" };
  }

  if (provider === "anthropic") {
    if (!isValidAnthropicApiKey(trimmed)) {
      return {
        valid: false,
        message:
          "La API key Anthropic deve iniziare con sk-ant- e contenere solo caratteri alfanumerici",
      };
    }
    return { valid: true };
  }

  if (provider === "openai") {
    if (!isValidOpenAiApiKey(trimmed)) {
      return {
        valid: false,
        message:
          "La API key OpenAI deve iniziare con sk- (formato non valido)",
      };
    }
    return { valid: true };
  }

  return { valid: true };
}
