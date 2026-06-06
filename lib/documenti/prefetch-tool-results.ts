import type { SupabaseClient } from "@supabase/supabase-js";
import type { GenerateDocumentRequest } from "@/validation/documenti/extracted-document";
import {
  cercaArticolo,
  cercaCliente,
  cercaClienteById,
  type ArticoloMatch,
  type ClienteMatch,
} from "@/lib/documenti/search-tools";

const MAX_ARTICLE_QUERIES = 8;

function buildArticleSearchQueries(input: GenerateDocumentRequest): string[] {
  const queries = new Set<string>();

  const oggetto = input.oggetto.trim();
  if (oggetto.length > 2) queries.add(oggetto);

  const lines = input.testo
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 3);

  for (const line of lines.slice(0, MAX_ARTICLE_QUERIES)) {
    const segment = line.split(/[,;–-]/)[0]?.trim() ?? line;
    if (segment.length > 2) {
      queries.add(segment.slice(0, 120));
    }
  }

  return Array.from(queries).slice(0, MAX_ARTICLE_QUERIES);
}

/**
 * Esegue le ricerche cliente/articolo lato server senza un round-trip AI con tool use.
 */
export async function prefetchDocumentToolResults(
  supabase: SupabaseClient,
  siteId: string,
  input: GenerateDocumentRequest,
): Promise<{
  clientesFound: Map<string, ClienteMatch[]>;
  articoliFound: Map<string, ArticoloMatch[]>;
  warnings: string[];
}> {
  const clientesFound = new Map<string, ClienteMatch[]>();
  const articoliFound = new Map<string, ArticoloMatch[]>();
  const warnings: string[] = [];

  const clientQuery = input.destinatario.ragioneSociale.trim();

  if (
    input.destinatario.entityId &&
    input.destinatario.tipo === "cliente"
  ) {
    const client = await cercaClienteById(
      supabase,
      siteId,
      input.destinatario.entityId,
    );
    if (client) {
      const key = clientQuery || client.nome;
      clientesFound.set(key, [client]);
    } else {
      warnings.push(
        `Cliente selezionato (ID ${input.destinatario.entityId}) non trovato nel database.`,
      );
    }
  } else if (clientQuery) {
    const clientResults = await cercaCliente(supabase, siteId, clientQuery);
    clientesFound.set(clientQuery, clientResults);
    if (clientResults.length === 0) {
      warnings.push(
        `Nessun cliente trovato per "${clientQuery}"; il destinatario sarà trattato come nuovo.`,
      );
    }
  }

  const articleQueries = buildArticleSearchQueries(input);
  await Promise.all(
    articleQueries.map(async (query) => {
      const results = await cercaArticolo(supabase, siteId, query);
      articoliFound.set(query, results);
    }),
  );

  return { clientesFound, articoliFound, warnings };
}
