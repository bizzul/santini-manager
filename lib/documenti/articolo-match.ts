import type { AIRiga } from "@/validation/documenti/extracted-document";
import type { ArticoloMatch } from "@/lib/documenti/search-tools";

export type ArticoloMatchLevel = "high" | "suggested" | "none";

export const MATCH_SCORE_HIGH = 0.85;
export const MATCH_SCORE_MIN = 0.55;
export const MATCH_SCORE_DOMINANCE_DELTA = 0.1;

export interface ArticoloSuggerito {
  id: string | number;
  codice: string | null;
  descrizione: string;
  unita: string | null;
  prezzo: number | null;
  immagineUrl: string | null;
  score: number;
  source: "sell_product";
}

export interface ArticoloRowMatch {
  level: ArticoloMatchLevel;
  articolo: ArticoloMatch | null;
  candidates: ArticoloSuggerito[];
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function hasExactCodeInText(riga: AIRiga, candidate: ArticoloMatch): boolean {
  if (!candidate.codice) return false;
  const code = normalize(candidate.codice);
  const text = normalize(`${riga.descrizione} ${riga.misure ?? ""}`);
  return text.includes(code);
}

function toSuggerito(match: ArticoloMatch): ArticoloSuggerito {
  return {
    id: match.id,
    codice: match.codice,
    descrizione: match.descrizione,
    unita: match.unita,
    prezzo: match.prezzo,
    immagineUrl: match.immagineUrl,
    score: match.score,
    source: match.source,
  };
}

function pickBestCandidates(candidates: ArticoloMatch[]): ArticoloMatch | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  return sorted[0] ?? null;
}

export function classifyArticoloMatch(
  riga: AIRiga,
  candidates: ArticoloMatch[],
): ArticoloRowMatch {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const second = sorted[1];

  if (!best) {
    return { level: "none", articolo: null, candidates: [] };
  }

  const exactCode = sorted.some((c) => hasExactCodeInText(riga, c));
  const highByScore = best.score >= MATCH_SCORE_HIGH || exactCode;

  if (highByScore) {
    return {
      level: "high",
      articolo: best,
      candidates: sorted.slice(0, 5).map(toSuggerito),
    };
  }

  if (best.score >= MATCH_SCORE_MIN) {
    const dominant =
      !second || best.score - second.score >= MATCH_SCORE_DOMINANCE_DELTA;
    if (dominant) {
      return {
        level: "high",
        articolo: best,
        candidates: sorted.slice(0, 5).map(toSuggerito),
      };
    }

    return {
      level: "suggested",
      articolo: null,
      candidates: sorted.slice(0, 5).map(toSuggerito),
    };
  }

  return { level: "none", articolo: null, candidates: [] };
}

export function resolvePrezzoUnitario(
  prezzoDaTesto: number,
  listino: number | null | undefined,
): number {
  if (prezzoDaTesto > 0) return prezzoDaTesto;
  if (listino != null && listino > 0) return listino;
  return prezzoDaTesto;
}
