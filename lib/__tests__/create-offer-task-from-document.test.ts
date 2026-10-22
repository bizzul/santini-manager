import {
  offerNameFromDocument,
  offerSellPriceFromDocument,
  shouldCreateOfferTaskForDocument,
} from "@/lib/documenti/create-offer-task-from-document";
import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";

const baseDocumento = (
  overrides: Partial<DocumentoArricchito> = {},
): DocumentoArricchito => ({
  tipoDocumento: "OFFERTA",
  destinatario: {
    ragioneSociale: "Marco Lovaldi",
    aca: null,
    via: null,
    cap: null,
    citta: null,
    clienteId: 12,
    fornitoreId: null,
    isNuovo: false,
    email: null,
  },
  oggetto: "Armadio cucina",
  righe: [],
  condizioniPagamento: [],
  termineFornitura: null,
  note: null,
  corpoTesto: null,
  allegati: [],
  ...overrides,
});

describe("shouldCreateOfferTaskForDocument", () => {
  it("crea offerta quando tipo OFFERTA, cliente DB e nessun task collegato", () => {
    expect(shouldCreateOfferTaskForDocument(baseDocumento(), null)).toBe(true);
  });

  it("non crea offerta se esiste già un task collegato", () => {
    expect(shouldCreateOfferTaskForDocument(baseDocumento(), 99)).toBe(false);
  });

  it("non crea offerta per tipi non OFFERTA", () => {
    expect(
      shouldCreateOfferTaskForDocument(
        baseDocumento({ tipoDocumento: "FATTURA" }),
        null,
      ),
    ).toBe(false);
  });

  it("non crea offerta senza cliente in anagrafica", () => {
    expect(
      shouldCreateOfferTaskForDocument(
        baseDocumento({
          destinatario: {
            ...baseDocumento().destinatario,
            clienteId: null,
            isNuovo: true,
          },
        }),
        null,
      ),
    ).toBe(false);
  });
});

describe("offerNameFromDocument", () => {
  it("estrae il nome dall'oggetto con prefisso offerta", () => {
    expect(
      offerNameFromDocument(
        baseDocumento({
          oggetto: "Offerta N°: 26-644-OFF - Armadio test",
        }),
      ),
    ).toBe("Armadio test");
  });

  it("usa l'oggetto intero se non ha prefisso", () => {
    expect(
      offerNameFromDocument(baseDocumento({ oggetto: "Cucina su misura" })),
    ).toBe("Cucina su misura");
  });
});

describe("offerSellPriceFromDocument", () => {
  const riga = (quantita: number, prezzoUnitario: number, sconto: number | null = null) => ({
    descrizione: "Finestra",
    misure: null,
    unita: "Pz." as const,
    quantita,
    prezzoUnitario,
    sconto,
    isTrasporto: false,
    articoloId: null,
    isNuovo: false,
  });

  it("ricalcola dalle righe quando i totali non sono presenti (route di salvataggio)", () => {
    const doc = baseDocumento({
      righe: [riga(2, 500), riga(1, 200, 10)],
    });
    // netto 1000 + 180 = 1180; IVA 8.1% = 95.58
    expect(offerSellPriceFromDocument(doc)).toBe(1275.58);
  });

  it("usa i totali del documento se presenti", () => {
    const doc = baseDocumento({
      righe: [riga(1, 100)],
      totali: { totNetto: 100, iva: 8.1, totaleCHF: 108.1 },
    });
    expect(offerSellPriceFromDocument(doc)).toBe(108.1);
  });

  it("vale 0 senza righe ne' totali", () => {
    expect(offerSellPriceFromDocument(baseDocumento())).toBe(0);
  });
});
