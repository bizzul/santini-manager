export interface MappedAiError {
  status: number;
  error: string;
  message?: string;
}

export function mapAiProviderError(error: unknown): MappedAiError {
  const err = error as {
    message?: string;
    statusCode?: number;
    cause?: { statusCode?: number };
  };

  const message = err?.message ?? "";
  const statusCode = err?.statusCode ?? err?.cause?.statusCode;

  if (
    statusCode === 401 ||
    message.includes("invalid x-api-key") ||
    message.includes("authentication") ||
    message.includes("API key")
  ) {
    return {
      status: 401,
      error: "API key non valida o scaduta",
      message:
        "Verifica la chiave Anthropic in Impostazioni > AI & Voice e riprova.",
    };
  }

  if (
    statusCode === 402 ||
    message.includes("credit") ||
    message.includes("billing") ||
    message.includes("insufficient")
  ) {
    return {
      status: 402,
      error: "Credito Anthropic esaurito",
      message:
        "Il credito dell'account Anthropic risulta esaurito. Ricarica il saldo e riprova.",
    };
  }

  if (
    statusCode === 429 ||
    message.includes("rate limit") ||
    message.includes("overloaded")
  ) {
    return {
      status: 429,
      error: "Troppe richieste",
      message: "Anthropic ha limitato le richieste. Attendi qualche secondo e riprova.",
    };
  }

  if (message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
    return {
      status: 503,
      error: "Servizio AI non raggiungibile",
      message:
        "Impossibile contattare Anthropic. Verifica la connessione e riprova.",
    };
  }

  return {
    status: 500,
    error: "Errore durante l'estrazione del documento",
    message: "Si e' verificato un errore imprevisto. Riprova tra poco.",
  };
}
