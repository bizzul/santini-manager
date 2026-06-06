/**
 * ID API Anthropic validi (alias ufficiali, vedi platform.claude.com/docs).
 * Gli ID *-latest e claude-3-5-* non sono più accettati dall'API.
 */
export const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-6";
export const ANTHROPIC_FAST_MODEL = "claude-haiku-4-5-20251001";
export const ANTHROPIC_POWERFUL_MODEL = "claude-opus-4-6";

/** Modelli deprecati o etichette UI -> ID API corrente. */
export const DEPRECATED_ANTHROPIC_MODEL_MAP: Record<string, string> = {
  "claude-3-5-sonnet-latest": ANTHROPIC_DEFAULT_MODEL,
  "claude-3-5-haiku-latest": ANTHROPIC_FAST_MODEL,
  "claude-3-opus-latest": ANTHROPIC_POWERFUL_MODEL,
  "claude-3-5-sonnet-20241022": ANTHROPIC_DEFAULT_MODEL,
  "claude-3-5-haiku-20241022": ANTHROPIC_FAST_MODEL,
  "Claude 3.5 Sonnet": ANTHROPIC_DEFAULT_MODEL,
  "Claude 3.5 Haiku": ANTHROPIC_FAST_MODEL,
};

export function resolveAnthropicModelId(model: string): string {
  const trimmed = model.trim();
  return DEPRECATED_ANTHROPIC_MODEL_MAP[trimmed] ?? trimmed;
}
