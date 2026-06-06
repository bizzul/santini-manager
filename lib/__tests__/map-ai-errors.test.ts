import { APICallError } from "@ai-sdk/provider";
import { mapAiProviderError } from "@/lib/ai/map-ai-errors";

describe("mapAiProviderError", () => {
  it("mappa 401 authentication_error con messaggio reale", () => {
    const error = new APICallError({
      message: "invalid x-api-key",
      url: "https://api.anthropic.com/v1/messages",
      requestBodyValues: {},
      statusCode: 401,
      responseBody: JSON.stringify({
        type: "error",
        error: {
          type: "authentication_error",
          message: "invalid x-api-key",
        },
      }),
    });

    const mapped = mapAiProviderError(error);
    expect(mapped.status).toBe(401);
    expect(mapped.error).toBe("API key non valida o assente");
    expect(mapped.providerErrorType).toBe("authentication_error");
    expect(mapped.message).toContain("invalid x-api-key");
  });

  it("mappa 404 model_not_found", () => {
    const error = new APICallError({
      message: "model: claude-old",
      url: "https://api.anthropic.com/v1/messages",
      requestBodyValues: {},
      statusCode: 404,
      responseBody: JSON.stringify({
        type: "error",
        error: {
          type: "not_found_error",
          message: "model: claude-old",
        },
      }),
    });

    const mapped = mapAiProviderError(error);
    expect(mapped.status).toBe(404);
    expect(mapped.providerErrorType).toBe("not_found_error");
    expect(mapped.message).toContain("model: claude-old");
  });

  it("mappa billing solo con type esplicito, non su keyword generiche", () => {
    const error = new APICallError({
      message: "Something went wrong",
      url: "https://api.anthropic.com/v1/messages",
      requestBodyValues: {},
      statusCode: 500,
      responseBody: JSON.stringify({
        type: "error",
        error: {
          type: "api_error",
          message: "Internal server error",
        },
      }),
    });

    const mapped = mapAiProviderError(error);
    expect(mapped.status).toBe(500);
    expect(mapped.error).not.toBe("Errore di credito/billing");
    expect(mapped.message).toContain("api_error");
  });

  it("mappa 429 rate_limit_error", () => {
    const error = new APICallError({
      message: "rate limit",
      url: "https://api.anthropic.com/v1/messages",
      requestBodyValues: {},
      statusCode: 429,
      responseBody: JSON.stringify({
        error: {
          type: "rate_limit_error",
          message: "Rate limit exceeded",
        },
      }),
    });

    const mapped = mapAiProviderError(error);
    expect(mapped.status).toBe(429);
    expect(mapped.providerErrorType).toBe("rate_limit_error");
  });
});
