import type { ZodIssue } from "zod";
import type { MappedAiError } from "@/lib/ai/map-ai-errors";

export interface GenerateErrorResponse {
  error: string;
  message: string;
  errors: string[];
  providerErrorType?: string;
  providerMessage?: string;
  statusCode?: number;
  details?: unknown;
}

function formatZodIssue(issue: ZodIssue): string {
  const path = issue.path.length > 0 ? issue.path.join(".") : "campo";
  return `${path}: ${issue.message}`;
}

export function zodIssuesToErrors(issues: ZodIssue[]): string[] {
  return issues.map(formatZodIssue);
}

function parseEmbeddedZodJson(message: string): string[] | null {
  const marker = "Error message:";
  const index = message.indexOf(marker);
  if (index === -1) return null;

  const jsonPart = message.slice(index + marker.length).trim();
  try {
    const parsed = JSON.parse(jsonPart) as Array<{
      path?: Array<string | number>;
      message?: string;
      code?: string;
      expected?: string;
      received?: string;
    }>;

    if (!Array.isArray(parsed)) return null;

    return parsed.map((item) => {
      const path = item.path?.length ? item.path.join(".") : "campo";
      const detail =
        item.expected && item.received
          ? `atteso ${item.expected}, ricevuto ${item.received}`
          : (item.message ?? item.code ?? "valore non valido");
      return `${path}: ${detail}`;
    });
  } catch {
    return null;
  }
}

export function buildErrorsFromMappedAiError(mapped: MappedAiError): string[] {
  const errors: string[] = [];

  if (mapped.providerErrorType) {
    errors.push(`Tipo errore provider: ${mapped.providerErrorType}`);
  }

  if (mapped.statusCode) {
    errors.push(`Codice HTTP provider: ${mapped.statusCode}`);
  }

  if (mapped.providerMessage) {
    errors.push(`Messaggio provider: ${mapped.providerMessage}`);
  }

  const parsedZod = mapped.message
    ? parseEmbeddedZodJson(mapped.message)
    : null;
  if (parsedZod?.length) {
    errors.push("Errori di validazione risposta AI:");
    errors.push(...parsedZod);
  } else if (mapped.message) {
    errors.push(mapped.message);
  }

  if (mapped.error && !errors.some((e) => e.includes(mapped.error))) {
    errors.unshift(mapped.error);
  }

  return Array.from(new Set(errors.filter(Boolean)));
}

export function buildGenerateErrorResponse(
  error: string,
  message: string,
  errors: string[],
  extra?: Partial<GenerateErrorResponse>,
): GenerateErrorResponse {
  const unique = Array.from(new Set(errors.filter(Boolean)));
  return {
    error,
    message,
    errors: unique.length > 0 ? unique : [message || error],
    ...extra,
  };
}
