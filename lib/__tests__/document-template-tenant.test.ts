import { applyFormDestinatarioToDocumento } from "@/lib/documenti/apply-form-destinatario";
import {
  DEFAULT_DOCUMENT_TEMPLATE,
  isDocumentTemplateConfigured,
  mergeDocumentTemplate,
} from "@/lib/documenti/template-types";
import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";

describe("document template tenant", () => {
  it("default globale e' neutro senza dati Matris", () => {
    expect(DEFAULT_DOCUMENT_TEMPLATE.mittente.ragioneSociale).toBe("");
    expect(DEFAULT_DOCUMENT_TEMPLATE.banca.iban).toBe("");
    expect(isDocumentTemplateConfigured(DEFAULT_DOCUMENT_TEMPLATE)).toBe(false);
  });

  it("merge usa solo config del sito", () => {
    const merged = mergeDocumentTemplate(
      {
        mittente: {
          ragioneSociale: "Santini Delbiaggio SA",
          via: "Via Mondari 15",
          cap: "6512",
          citta: "Giubiasco",
          iva: "CHE-123",
        },
        banca: { nome: "Banca Test", iban: "CH00 0000" },
      },
      null,
    );
    expect(merged.mittente.ragioneSociale).toBe("Santini Delbiaggio SA");
    expect(isDocumentTemplateConfigured(merged)).toBe(true);
  });
});

describe("applyFormDestinatarioToDocumento", () => {
  it("non modifica il mittente del template (solo destinatario)", () => {
    const documento: DocumentoArricchito = {
      tipoDocumento: "OFFERTA",
      destinatario: {
        ragioneSociale: "Matris pro SA",
        aca: null,
        via: "Via Parco 4",
        cap: "6500",
        citta: "Bellinzona",
        clienteId: 99,
        fornitoreId: null,
        isNuovo: false,
        email: null,
      },
      oggetto: "Test",
      righe: [],
      condizioniPagamento: [],
      termineFornitura: null,
      note: null,
      corpoTesto: null,
      allegati: [],
    };

    applyFormDestinatarioToDocumento(documento, {
      tipo: "cliente",
      entityId: 12,
      ragioneSociale: "Marco Lovaldi",
      aca: null,
      via: null,
      cap: null,
      citta: null,
      email: null,
    });

    expect(documento.destinatario.ragioneSociale).toBe("Marco Lovaldi");
    expect(documento.destinatario.clienteId).toBe(12);
  });
});
