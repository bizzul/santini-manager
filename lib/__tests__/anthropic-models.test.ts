import {
  ANTHROPIC_DEFAULT_MODEL,
  ANTHROPIC_FAST_MODEL,
  resolveAnthropicModelId,
} from "@/lib/ai/anthropic-models";

describe("resolveAnthropicModelId", () => {
  it("rimappa claude-3-5-sonnet-latest al modello corrente", () => {
    expect(resolveAnthropicModelId("claude-3-5-sonnet-latest")).toBe(
      ANTHROPIC_DEFAULT_MODEL,
    );
  });

  it("rimappa claude-3-5-haiku-latest", () => {
    expect(resolveAnthropicModelId("claude-3-5-haiku-latest")).toBe(
      ANTHROPIC_FAST_MODEL,
    );
  });

  it("lascia invariati gli ID gia validi", () => {
    expect(resolveAnthropicModelId("claude-sonnet-4-6")).toBe(
      "claude-sonnet-4-6",
    );
  });
});
