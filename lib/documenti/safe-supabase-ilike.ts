/**
 * Pattern ilike sicuro per filtri PostgREST (.or con valori che contengono punti, virgole, ecc.).
 */
export function toPostgrestIlikePattern(query: string): string {
  const pattern = `%${query.trim()}%`;
  return `"${pattern.replace(/\\/g, "\\\\").replace(/"/g, '""')}"`;
}
