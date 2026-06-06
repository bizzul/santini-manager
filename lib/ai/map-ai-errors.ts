import {
  APICallError,
  NoSuchModelError,
  TypeValidationError,
  type AISDKError,
} from "@ai-sdk/provider";

function isNoObjectGeneratedError(
  error: unknown,
): error is Error & { text?: string; cause?: unknown } {
  return (
    error instanceof Error && error.name === "AI_NoObjectGeneratedError"
  );
}

export interface MappedAiError {
  status: number;
  error: string;
  message: string;
  providerErrorType?: string;
  providerMessage?: string;
  statusCode?: number;
  responseBody?: string;
}

interface ProviderErrorBody {
  type?: string;
  error?: {
    type?: string;
    message?: string;
  };
  message?: string;
}

function parseProviderBody(responseBody?: string): ProviderErrorBody | null {
  if (!responseBody?.trim()) return null;
  try {
    return JSON.parse(responseBody) as ProviderErrorBody;
  } catch {
    return null;
  }
}

function extractProviderDetails(error: APICallError): {
  providerErrorType?: string;
  providerMessage?: string;
} {
  const parsed = parseProviderBody(error.responseBody);
  const data = error.data as ProviderErrorBody | undefined;

  const providerErrorType =
    parsed?.error?.type ??
    parsed?.type ??
    data?.error?.type ??
    data?.type;

  const providerMessage =
    parsed?.error?.message ??
    parsed?.message ??
    data?.error?.message ??
    data?.message ??
    error.message;

  return { providerErrorType, providerMessage };
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

function mapFromApiCallError(apiError: APICallError): MappedAiError {
  const statusCode = apiError.statusCode ?? 500;
  const { providerErrorType, providerMessage } =
    extractProviderDetails(apiError);
  const body = providerMessage ?? apiError.message;

  if (
    statusCode === 401 ||
    providerErrorType === "authentication_error" ||
    providerErrorType === "invalid_api_key"
  ) {
    return {
      status: 401,
      error: "API key non valida o assente",
      message: `[${providerErrorType ?? "authentication_error"}] ${body}`,
      providerErrorType,
      providerMessage: body,
      statusCode,
      responseBody: apiError.responseBody,
    };
  }

  if (
    statusCode === 403 ||
    providerErrorType === "permission_error" ||
    providerErrorType === "forbidden"
  ) {
    return {
      status: 403,
      error: "La chiave non ha accesso a questo modello/workspace",
      message: `[${providerErrorType ?? "permission_error"}] ${body}`,
      providerErrorType,
      providerMessage: body,
      statusCode,
      responseBody: apiError.responseBody,
    };
  }

  if (
    statusCode === 404 ||
    providerErrorType === "not_found_error" ||
    providerErrorType === "model_not_found"
  ) {
    return {
      status: 404,
      error: "Modello non disponibile",
      message: `[${providerErrorType ?? "not_found_error"}] ${body}`,
      providerErrorType,
      providerMessage: body,
      statusCode,
      responseBody: apiError.responseBody,
    };
  }

  if (
    statusCode === 429 ||
    providerErrorType === "rate_limit_error" ||
    providerErrorType === "overloaded_error"
  ) {
    return {
      status: 429,
      error: "Limite di richieste o quota raggiunti",
      message: `[${providerErrorType ?? "rate_limit_error"}] ${body}`,
      providerErrorType,
      providerMessage: body,
      statusCode,
      responseBody: apiError.responseBody,
    };
  }

  if (
    statusCode === 402 ||
    providerErrorType === "insufficient_quota" ||
    providerErrorType === "billing_error" ||
    (providerErrorType?.includes("credit") ?? false) ||
    (body.toLowerCase().includes("credit balance") ?? false) ||
    (body.toLowerCase().includes("billing") ?? false)
  ) {
    return {
      status: 402,
      error: "Errore di credito/billing",
      message: `[${providerErrorType ?? "billing_error"}] ${body}`,
      providerErrorType,
      providerMessage: body,
      statusCode,
      responseBody: apiError.responseBody,
    };
  }

  if (statusCode === 400 || providerErrorType === "invalid_request_error") {
    return {
      status: 400,
      error: "Richiesta non valida",
      message: `[${providerErrorType ?? "invalid_request_error"}] ${body}`,
      providerErrorType,
      providerMessage: body,
      statusCode,
      responseBody: apiError.responseBody,
    };
  }

  return {
    status: statusCode >= 400 && statusCode < 600 ? statusCode : 500,
    error: "Errore dal provider AI",
    message: `[${providerErrorType ?? `HTTP ${statusCode}`}] ${body}`,
    providerErrorType,
    providerMessage: body,
    statusCode,
    responseBody: apiError.responseBody,
  };
}

export function mapAiProviderError(error: unknown): MappedAiError {
  const apiError = findApiCallError(error);
  if (apiError) {
    return mapFromApiCallError(apiError);
  }

  if (isNoObjectGeneratedError(error)) {
    const objError = error;
    const causeMsg =
      objError.cause instanceof Error ? objError.cause.message : undefined;
    return {
      status: 422,
      error: "L'AI non ha prodotto un documento valido",
      message: causeMsg
        ? `${objError.message} — ${causeMsg}`
        : objError.message,
      providerMessage: objError.text?.slice(0, 500),
    };
  }

  if (TypeValidationError.isInstance(error)) {
    return {
      status: 422,
      error: "Risposta AI non valida",
      message: error.message,
      providerMessage: error.message,
    };
  }

  if (NoSuchModelError.isInstance(error)) {
    const modelError = error as NoSuchModelError;
    return {
      status: 404,
      error: "Modello non disponibile",
      message: `Modello non disponibile: ${modelError.modelId}`,
      providerErrorType: "model_not_found",
      providerMessage: modelError.message,
    };
  }

  const err = error as AISDKError & {
    message?: string;
    statusCode?: number;
    responseBody?: string;
  };

  const message = err?.message ?? String(error);
  const statusCode = err?.statusCode;

  if (
    message.includes("fetch failed") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND")
  ) {
    return {
      status: 503,
      error: "Servizio AI non raggiungibile",
      message: `Errore di rete: ${message}`,
      providerMessage: message,
    };
  }

  if (statusCode) {
    return {
      status: statusCode,
      error: "Errore dal provider AI",
      message,
      statusCode,
      responseBody: err.responseBody,
      providerMessage: message,
    };
  }

  return {
    status: 500,
    error: "Errore durante la generazione",
    message,
    providerMessage: message,
  };
}
