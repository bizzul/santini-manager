import {
  classifyArticoloMatch,
  type ArticoloRowMatch,
} from "@/lib/documenti/articolo-match";
import type {
  AIDocumento,
} from "@/validation/documenti/extracted-document";
import type { ArticoloMatch, ClienteMatch } from "@/lib/documenti/search-tools";
import { cercaArticolo } from "@/lib/documenti/search-tools";
import type { SupabaseClient } from "@supabase/supabase-js";

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function findBestClienteMatch(
  ragioneSociale: string,
  clientes: Map<string, ClienteMatch[]>,
): ClienteMatch | null {
  const key = normalize(ragioneSociale);
  const direct = clientes.get(ragioneSociale) ?? clientes.get(key);
  if (direct?.[0]) return direct[0];

  for (const results of Array.from(clientes.values())) {
    for (const client of results) {
      const clientName = normalize(client.nome);
      if (clientName === key || clientName.includes(key) || key.includes(clientName)) {
        return client;
      }
    }
  }
  return null;
}

function collectCandidatesForRiga(
  riga: AIDocumento["righe"][number],
  articoli: Map<string, ArticoloMatch[]>,
): ArticoloMatch[] {
  const seen = new Map<string, ArticoloMatch>();
  const searchText = normalize(`${riga.descrizione} ${riga.misure ?? ""}`);

  for (const [query, results] of Array.from(articoli.entries())) {
    const q = normalize(query);
    if (searchText.includes(q) || q.includes(searchText.slice(0, 40))) {
      for (const result of results) {
        seen.set(String(result.id), result);
      }
    }
  }

  for (const results of Array.from(articoli.values())) {
    for (const article of results) {
      const name = normalize(article.descrizione);
      if (searchText.includes(name) || name.includes(searchText.slice(0, 30))) {
        seen.set(String(article.id), article);
      }
      if (article.codice && searchText.includes(normalize(article.codice))) {
        seen.set(String(article.id), { ...article, score: Math.max(article.score, 1) });
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) => b.score - a.score);
}

export function resolveMatchesFromToolResults(
  documento: AIDocumento,
  clientes: Map<string, ClienteMatch[]>,
  articoli: Map<string, ArticoloMatch[]>,
): {
  clienteMatch: ClienteMatch | null;
  articoloMatches: Map<number, ArticoloRowMatch>;
} {
  const clienteMatch = findBestClienteMatch(
    documento.destinatario.ragioneSociale,
    clientes,
  );

  const articoloMatches = new Map<number, ArticoloRowMatch>();

  documento.righe.forEach((riga, index) => {
    const candidates = collectCandidatesForRiga(riga, articoli);
    articoloMatches.set(index, classifyArticoloMatch(riga, candidates));
  });

  return { clienteMatch, articoloMatches };
}

/** Ricerca articoli per ogni riga generata dall'AI (post-generazione). */
export async function prefetchArticoliForRighe(
  supabase: SupabaseClient,
  siteId: string,
  righe: AIDocumento["righe"],
  articoliFound: Map<string, ArticoloMatch[]>,
): Promise<void> {
  await Promise.all(
    righe.map(async (riga) => {
      const query = riga.descrizione.trim();
      if (!query || articoliFound.has(query)) return;
      const results = await cercaArticolo(supabase, siteId, query);
      articoliFound.set(query, results);
    }),
  );
}
