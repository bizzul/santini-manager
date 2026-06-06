export interface GenerateApiErrorPayload {
  error?: string;
  message?: string;
  errors?: string[];
  providerErrorType?: string;
  providerMessage?: string;
  statusCode?: number;
  details?: Array<{ path?: Array<string | number>; message?: string }>;
}

export function errorsFromGenerateApiPayload(
  payload: GenerateApiErrorPayload,
  httpStatus: number,
): string[] {
  if (payload.errors?.length) {
    return payload.errors;
  }

  const errors: string[] = [`HTTP ${httpStatus}`];

  if (payload.error) errors.push(payload.error);
  if (payload.message) errors.push(payload.message);
  if (payload.providerErrorType) {
    errors.push(`Tipo provider: ${payload.providerErrorType}`);
  }
  if (payload.providerMessage) {
    errors.push(`Dettaglio provider: ${payload.providerMessage}`);
  }

  if (payload.details?.length) {
    for (const detail of payload.details) {
      const path = detail.path?.length ? detail.path.join(".") : "campo";
      errors.push(`${path}: ${detail.message ?? "non valido"}`);
    }
  }

  return Array.from(new Set(errors.filter(Boolean)));
}

export function errorsFromFetchFailure(
  error: unknown,
  httpStatus?: number,
  responseText?: string,
): string[] {
  const errors: string[] = [];

  if (httpStatus) {
    errors.push(`Codice risposta server: HTTP ${httpStatus}`);
    if (httpStatus === 504 || httpStatus === 408) {
      errors.push(
        "La generazione ha superato il tempo massimo consentito dal server.",
      );
    }
  }

  if (error instanceof Error) {
    errors.push(`Errore client: ${error.message}`);
    if (error.message.includes("Failed to fetch")) {
      errors.push(
        "La connessione al server è stata interrotta prima del completamento.",
      );
      errors.push(
        "Possibili cause: timeout, deploy in corso, server non raggiungibile.",
      );
    }
  } else {
    errors.push("Errore client sconosciuto durante la richiesta.");
  }

  if (responseText?.trim()) {
    const excerpt = responseText.trim().slice(0, 300);
    errors.push(`Corpo risposta (estratto): ${excerpt}`);
  }

  return errors;
}
