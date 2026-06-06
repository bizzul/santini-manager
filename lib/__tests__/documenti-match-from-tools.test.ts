import { resolveMatchesFromToolResults } from "@/lib/documenti/match-from-tools";
import type { AIDocumento } from "@/validation/documenti/extracted-document";
import type {
  ArticoloMatch,
  ClienteMatch,
} from "@/lib/documenti/search-tools";

const baseDocumento: AIDocumento = {
  tipoDocumento: "OFFERTA",
  destinatario: {
    ragioneSociale: "Santini Delbiaggio SA",
    aca: "Nicola Santini",
    via: "Via Mondari 15",
    cap: "6512",
    citta: "Giubiasco",
  },
  oggetto: "Liste abete",
  righe: [
    {
      descrizione: "Liste decorative in abete",
      misure: "4000mm x 40mm",
      unita: "m1",
      quantita: 100,
      prezzoUnitario: 3.9,
      sconto: null,
      isTrasporto: false,
    },
  ],
  condizioniPagamento: ["- 50% all'ordine"],
  termineFornitura: null,
  note: null,
};

describe("resolveMatchesFromToolResults", () => {
  it("risolve cliente e articolo dai risultati tool", () => {
    const clientes = new Map<string, ClienteMatch[]>([
      [
        "Santini Delbiaggio SA",
        [
          {
            id: 42,
            nome: "Santini Delbiaggio SA",
            via: "Via Mondari 15",
            cap: "6512",
            citta: "Giubiasco",
          },
        ],
      ],
    ]);

    const articoli = new Map<string, ArticoloMatch[]>([
      [
        "liste abete",
        [
          {
            id: 7,
            codice: "AB-01",
            descrizione: "Liste decorative in abete",
            prezzo: 3.9,
            unita: "m1",
            immagineUrl: null,
            score: 0.92,
            source: "sell_product",
          },
        ],
      ],
    ]);

    const { clienteMatch, articoloMatches } = resolveMatchesFromToolResults(
      baseDocumento,
      clientes,
      articoli,
    );

    expect(clienteMatch?.id).toBe(42);
    expect(articoloMatches.get(0)?.level).toBe("high");
    expect(articoloMatches.get(0)?.articolo?.id).toBe(7);
    expect(articoloMatches.get(0)?.articolo?.source).toBe("sell_product");
  });

  it("restituisce none se nessun match", () => {
    const { clienteMatch, articoloMatches } = resolveMatchesFromToolResults(
      baseDocumento,
      new Map(),
      new Map(),
    );

    expect(clienteMatch).toBeNull();
    expect(articoloMatches.get(0)?.level).toBe("none");
    expect(articoloMatches.get(0)?.articolo).toBeNull();
  });
});
