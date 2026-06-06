import type {
  AIDocumento,
  AIRiga,
} from "@/validation/documenti/extracted-document";
import type { ArticoloMatch, ClienteMatch } from "@/lib/documenti/search-tools";

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

function findBestArticoloMatch(
  riga: AIRiga,
  articoli: Map<string, ArticoloMatch[]>,
): { id: string | number; source: "sell_product" | "inventory" } | null {
  const searchText = normalize(`${riga.descrizione} ${riga.misure ?? ""}`);

  for (const [query, results] of Array.from(articoli.entries())) {
    const q = normalize(query);
    if (searchText.includes(q) || q.includes(searchText.slice(0, 40))) {
      const first = results[0];
      if (first) {
        return { id: first.id, source: first.source };
      }
    }
  }

  for (const results of Array.from(articoli.values())) {
    for (const article of results) {
      const name = normalize(article.nome);
      if (searchText.includes(name) || name.includes(searchText.slice(0, 30))) {
        return { id: article.id, source: article.source };
      }
    }
  }

  return null;
}

export function resolveMatchesFromToolResults(
  documento: AIDocumento,
  clientes: Map<string, ClienteMatch[]>,
  articoli: Map<string, ArticoloMatch[]>,
): {
  clienteMatch: ClienteMatch | null;
  articoloMatches: Map<
    number,
    { id: string | number; source: "sell_product" | "inventory" } | null
  >;
} {
  const clienteMatch = findBestClienteMatch(
    documento.destinatario.ragioneSociale,
    clientes,
  );

  const articoloMatches = new Map<
    number,
    { id: string | number; source: "sell_product" | "inventory" } | null
  >();

  documento.righe.forEach((riga, index) => {
    articoloMatches.set(index, findBestArticoloMatch(riga, articoli));
  });

  return { clienteMatch, articoloMatches };
}
