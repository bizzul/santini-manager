import {
  offerNameFromDocument,
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
