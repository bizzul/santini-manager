import {
  buildTemplateFromCatalog,
  hasPdfmeOverlay,
} from "@/lib/documenti/default-pdfme-template";
import { mapDocumentoToPdfmeInputs } from "@/lib/documenti/map-documento-to-pdfme-inputs";
import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";

const baseCommercialDocumento: DocumentoArricchito = {
  tipoDocumento: "OFFERTA",
  destinatario: {
    ragioneSociale: "Città di Bellinzona",
    aca: "Settore opere pubbliche",
    via: "Via Example 1",
    cap: "6500",
    citta: "Bellinzona",
    email: null,
    clienteId: null,
    isNuovo: false,
  },
  oggetto: "Scuola elementare Stazione",
  corpoTesto: null,
  righe: [
    {
      descrizione: "Prodotto A",
      misure: null,
      unita: "Pz.",
      quantita: 2,
      prezzoUnitario: 100,
      sconto: 10,
      isTrasporto: false,
      articoloId: null,
      isNuovo: false,
      art: "1",
      totaleRiga: 180,
    },
  ],
  condizioniPagamento: ["- 50% all'ordine"],
  termineFornitura: "3-4 settimane",
  note: null,
  totali: { totNetto: 180, iva: 14.58, totaleCHF: 194.58 },
  allegati: [],
};

describe("mapDocumentoToPdfmeInputs", () => {
  it("mappa destinatario, oggetto e tabella per documenti commerciali", () => {
    const inputs = mapDocumentoToPdfmeInputs(baseCommercialDocumento, {
      numero: "26-128",
      createdAt: "2026-06-08T00:00:00.000Z",
    });

    expect(inputs.destinatario).toContain("Città di Bellinzona");
    expect(inputs.destinatario).toContain("a.c.a Settore opere pubbliche");
    expect(inputs.oggetto).toContain("Offerta N°: 26-128");
    expect(inputs.oggetto).toContain("Scuola elementare Stazione");
    expect(inputs.totale).toContain("194.58");

    const rows = JSON.parse(inputs.tabellaRighe) as string[][];
    expect(rows).toHaveLength(1);
    expect(rows[0][0]).toBe("1");
    expect(rows[0][1]).toContain("Prodotto A");
  });

  it("mappa corpoTesto per lettere", () => {
    const inputs = mapDocumentoToPdfmeInputs(
      {
        ...baseCommercialDocumento,
        tipoDocumento: "LETTERA_UFFICIALE",
        corpoTesto: "Testo della lettera.",
        righe: [],
      },
      { numero: "L-1" },
    );

    expect(inputs.corpoTesto).toBe("Testo della lettera.");
    expect(inputs.tabellaRighe).toBeUndefined();
  });
});

describe("hasPdfmeOverlay", () => {
  it("ritorna true quando basePdf e schemas sono configurati", () => {
    const template = buildTemplateFromCatalog(
      "https://example.com/letterhead.pdf",
      "commercial",
      "matris",
    );
    expect(
      hasPdfmeOverlay({
        pdfmeTemplate: template,
        letterheadBasePdf: { url: "https://example.com/letterhead.pdf" },
      }),
    ).toBe(true);
  });

  it("ritorna false senza template pdfme", () => {
    expect(hasPdfmeOverlay({ pdfmeTemplate: null })).toBe(false);
  });
});

describe("buildTemplateFromCatalog", () => {
  it("crea schemi commerciali con basePdf URL", () => {
    const template = buildTemplateFromCatalog(
      "https://example.com/base.pdf",
      "commercial",
      "matris",
    );
    expect(template.basePdf).toBe("https://example.com/base.pdf");
    expect(template.schemas[0]).toHaveProperty("destinatario");
    expect(template.schemas[0]).toHaveProperty("numeroDocumento");
    expect(template.schemas[0]).toHaveProperty("tabellaRighe");
  });

  it("crea schemi lettera con corpoTesto", () => {
    const template = buildTemplateFromCatalog(
      "https://example.com/base.pdf",
      "letter",
      "lettera",
    );
    expect(template.schemas[0]).toHaveProperty("corpoTesto");
    expect(template.schemas[0]).not.toHaveProperty("tabellaRighe");
  });
});
