import { maskApiKey } from "@/lib/ai/mask-api-key";
import {
  isValidAnthropicApiKey,
  validateAiApiKeyForProvider,
} from "@/lib/ai/validate-api-key";

describe("maskApiKey", () => {
  it("maschera chiavi Anthropic con prefisso sk-ant-", () => {
    expect(maskApiKey("sk-ant-api03-abc123xyz7890")).toBe(
      "sk-ant-...7890",
    );
  });

  it("maschera chiavi OpenAI", () => {
    expect(maskApiKey("sk-proj-abc123xyz7890")).toBe("sk-...7890");
  });
});

describe("validateAiApiKeyForProvider", () => {
  it("accetta chiavi Anthropic valide", () => {
    expect(
      validateAiApiKeyForProvider("anthropic", "sk-ant-api03-testkey1234"),
    ).toEqual({ valid: true });
  });

  it("rifiuta chiavi Anthropic senza prefisso sk-ant-", () => {
    const result = validateAiApiKeyForProvider("anthropic", "sk-openai-key");
    expect(result.valid).toBe(false);
  });

  it("rifiuta chiavi Anthropic nel provider OpenAI", () => {
    const result = validateAiApiKeyForProvider(
      "openai",
      "sk-ant-api03-testkey1234",
    );
    expect(result.valid).toBe(false);
  });
});

describe("isValidAnthropicApiKey", () => {
  it("valida il formato atteso", () => {
    expect(isValidAnthropicApiKey("sk-ant-api03-AbC_123")).toBe(true);
    expect(isValidAnthropicApiKey("invalid")).toBe(false);
  });
});
