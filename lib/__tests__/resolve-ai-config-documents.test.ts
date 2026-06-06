import { resolveDocumentAiFromSettings } from "@/lib/ai/resolve-document-ai-config";

describe("resolveDocumentAiFromSettings", () => {
  const originalAnthropic = process.env.ANTHROPIC_API_KEY;
  const originalOpenai = process.env.OPENAI_API_KEY;

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalAnthropic;
    process.env.OPENAI_API_KEY = originalOpenai;
  });

  it("prioritizes documenti_ai_* over global settings", () => {
    const result = resolveDocumentAiFromSettings({
      ai_provider: "openai",
      ai_model: "gpt-4o-mini",
      ai_api_key: "sk-global-key",
      documenti_ai_provider: "anthropic",
      documenti_ai_model: "claude-3-5-sonnet-latest",
      documenti_ai_api_key: "sk-ant-doc-key",
    });

    expect(result).toEqual({
      provider: "anthropic",
      apiKey: "sk-ant-doc-key",
      model: "claude-3-5-sonnet-latest",
      source: "database",
    });
  });

  it("falls back to global ai_* when documenti key is absent", () => {
    const result = resolveDocumentAiFromSettings({
      ai_provider: "openai",
      ai_model: "gpt-4o",
      ai_api_key: "sk-global-key",
      documenti_ai_provider: "anthropic",
      documenti_ai_model: "claude-3-5-haiku-latest",
    });

    expect(result?.provider).toBe("anthropic");
    expect(result?.apiKey).toBe("sk-global-key");
    expect(result?.model).toBe("claude-3-5-haiku-latest");
  });

  it("falls back to environment when no database keys", () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.OPENAI_API_KEY = "sk-env-openai";

    const result = resolveDocumentAiFromSettings({
      ai_provider: "openai",
      ai_model: "gpt-4o-mini",
    });

    expect(result).toEqual({
      provider: "openai",
      apiKey: "sk-env-openai",
      model: "gpt-4o-mini",
      source: "environment",
    });
  });

  it("returns null when no keys available", () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;

    expect(resolveDocumentAiFromSettings(null)).toBeNull();
  });
});
