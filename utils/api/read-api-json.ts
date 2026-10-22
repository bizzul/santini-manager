export const SESSION_EXPIRED_MESSAGE = "Sessione scaduta, ricarica la pagina";

type ErrorPayload = {
  error?: unknown;
  message?: unknown;
  code?: unknown;
};

function isLoginRedirect(url: string): boolean {
  try {
    const pathname = new URL(url, "http://localhost").pathname;
    return pathname === "/login" || pathname.startsWith("/login/");
  } catch {
    return false;
  }
}

function messageFromPayload(payload: ErrorPayload, status: number): string {
  const message = typeof payload.message === "string" ? payload.message : "";
  const error = typeof payload.error === "string" ? payload.error : "";
  if (status === 401 || error === "unauthorized" || payload.code === "unauthorized") {
    return message && message !== "unauthorized" ? message : SESSION_EXPIRED_MESSAGE;
  }
  return message || error || "Errore durante la richiesta";
}

/**
 * Reads a fetch Response without ever calling Response.json() on an empty or
 * HTML body. A 401, a redirect to /login, or an empty error body becomes a
 * readable session message instead of "Unexpected end of JSON input".
 */
export async function readApiJson<T>(response: Response): Promise<T> {
  if (response.redirected && isLoginRedirect(response.url)) {
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }
  if (response.status >= 300 && response.status < 400) {
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }

  const type = response.headers.get("content-type") || "";
  if (!response.ok && type.includes("text/html")) {
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }

  const text = await response.text();
  if (!text.trim()) {
    if (!response.ok) throw new Error(SESSION_EXPIRED_MESSAGE);
    return undefined as T;
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      response.ok ? "Risposta non valida dal server" : SESSION_EXPIRED_MESSAGE,
    );
  }

  if (!response.ok) {
    throw new Error(messageFromPayload((data || {}) as ErrorPayload, response.status));
  }

  return data as T;
}

export function sessionExpiredResponse(): Response {
  return new Response(
    JSON.stringify({
      error: SESSION_EXPIRED_MESSAGE,
      code: "unauthorized",
    }),
    {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );
}

/**
 * Turns a redirect, an empty body, or a bare `{ error: "unauthorized" }` from
 * an /api call into JSON the existing callers can read.
 */
export async function normalizeApiResponse(
  path: string,
  response: Response,
): Promise<Response> {
  if (!path.startsWith("/api/")) return response;
  if (response.ok && !response.redirected) return response;

  if (response.redirected && isLoginRedirect(response.url)) {
    return sessionExpiredResponse();
  }
  if (response.status >= 300 && response.status < 400) {
    return sessionExpiredResponse();
  }

  const type = response.headers.get("content-type") || "";
  if (!response.ok && type.includes("text/html")) {
    return sessionExpiredResponse();
  }

  if (response.status === 401) {
    const text = await response.clone().text().catch(() => "");
    if (!text.trim()) return sessionExpiredResponse();
    try {
      const data = JSON.parse(text) as ErrorPayload;
      if (!data.error || data.error === "unauthorized") return sessionExpiredResponse();
    } catch {
      return sessionExpiredResponse();
    }
    return response;
  }

  if (!response.ok) {
    const text = await response.clone().text().catch(() => "");
    if (!text.trim()) return sessionExpiredResponse();
  }

  return response;
}
