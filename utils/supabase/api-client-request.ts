/**
 * Client fetches to /api/* must get JSON, not the HTML redirect used for a
 * full page load. Address-bar navigation still sends Accept: text/html or
 * Sec-Fetch-Mode: navigate and keeps the login redirect.
 */
export function isApiClientRequest(
  pathname: string,
  headers: { get(name: string): string | null },
): boolean {
  if (!pathname.startsWith("/api/")) return false;
  if (headers.get("x-requested-with")) return true;
  if (headers.get("sec-fetch-mode") === "navigate") return false;
  if (headers.get("sec-fetch-dest") === "document") return false;
  const accept = (headers.get("accept") || "").toLowerCase();
  if (accept.includes("text/html") && !accept.includes("application/json")) return false;
  return true;
}
