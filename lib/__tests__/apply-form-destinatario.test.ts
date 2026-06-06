import { applyFormDestinatarioToDocumento } from "@/lib/documenti/apply-form-destinatario";
import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";

const baseDocumento = (): DocumentoArricchito => ({
  tipoDocumento: "OFFERTA",
  destinatario: {
    ragioneSociale: "Matris pro SA",
    aca: "Sig. Altro Cliente",
    via: "Via Sbagliata 1",
    cap: "6500",
    citta: "Bellinzona",
    clienteId: 99,
    fornitoreId: null,
    isNuovo: false,
    email: "altro@example.com",
  },
  oggetto: "Test",
  righe: [],
  condizioniPagamento: [],
  termineFornitura: null,
  note: null,
  corpoTesto: null,
  allegati: [],
});

describe("applyFormDestinatarioToDocumento", () => {
  it("sovrascrive il destinatario AI con i dati del form", () => {
    const documento = baseDocumento();
    applyFormDestinatarioToDocumento(documento, {
      tipo: "cliente",
      entityId: 42,
      ragioneSociale: "Marco Lovaldi",
      aca: "Marco Lovaldi",
      via: "Via Pizzo Corgella 2",
      cap: "6592",
      citta: "S. Antonino",
      email: "marco@example.com",
    });

    expect(documento.destinatario.ragioneSociale).toBe("Marco Lovaldi");
    expect(documento.destinatario.clienteId).toBe(42);
    expect(documento.destinatario.via).toBe("Via Pizzo Corgella 2");
    expect(documento.destinatario.isNuovo).toBe(false);
  });

  it("imposta isNuovo per destinatario manuale", () => {
    const documento = baseDocumento();
    applyFormDestinatarioToDocumento(documento, {
      tipo: "manuale",
      entityId: null,
      ragioneSociale: "Cliente occasionale",
      aca: null,
      via: null,
      cap: null,
      citta: null,
      email: null,
    });

    expect(documento.destinatario.clienteId).toBeNull();
    expect(documento.destinatario.isNuovo).toBe(true);
  });
});
