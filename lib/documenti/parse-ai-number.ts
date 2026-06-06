/**
 * Converte valori numerici restituiti dall'AI (spesso stringhe) in number.
 */
export function parseAiNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const cleaned = trimmed
      .replace(/chf/gi, "")
      .replace(/%/g, "")
      .replace(/\s/g, "")
      .replace(/'/g, "")
      .replace(",", ".");

    const n = Number(cleaned);
    if (Number.isFinite(n)) return n;
  }

  return null;
}
