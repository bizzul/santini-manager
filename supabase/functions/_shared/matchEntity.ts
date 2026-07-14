/**
 * Matching entità — copia Deno per Edge Function.
 * Allineata a lib/entities/matchEntity.ts (test unitari lì).
 */

export type MatchableEntity = {
  id: string;
  name: string;
  aliases: string[];
  deleted_at?: string | null;
};

export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function maxEditTolerance(len: number): number {
  if (len <= 4) return 1;
  if (len <= 8) return 2;
  return 3;
}

export function matchEntity(
  name: string | null | undefined,
  entities: MatchableEntity[],
): string | null {
  if (!name || !name.trim()) return null;
  const needle = normalizeText(name);
  if (!needle) return null;
  const active = entities.filter((e) => e.deleted_at == null);

  for (const e of active) {
    const candidates = [e.name, ...(e.aliases ?? [])].map(normalizeText);
    if (candidates.includes(needle)) return e.id;
  }

  for (const e of active) {
    const candidates = [e.name, ...(e.aliases ?? [])].map(normalizeText);
    for (const c of candidates) {
      if (!c) continue;
      if ((c.includes(needle) || needle.includes(c)) &&
        Math.min(c.length, needle.length) >= 3) {
        return e.id;
      }
    }
  }

  let best: { id: string; dist: number } | null = null;
  for (const e of active) {
    const candidates = [e.name, ...(e.aliases ?? [])].map(normalizeText);
    for (const c of candidates) {
      if (!c) continue;
      const dist = editDistance(needle, c);
      const tol = maxEditTolerance(Math.max(needle.length, c.length));
      if (dist <= tol && (best === null || dist < best.dist)) {
        best = { id: e.id, dist };
      }
    }
  }
  return best?.id ?? null;
}
