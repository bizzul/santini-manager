import {
  buildTemplateFromCatalog,
  getDefaultEnabledFieldIds,
  getFieldsForVariant,
  sanitizeTemplateWithCatalog,
  syncTemplateWithCatalog,
  templateHasSeparateNumeroDocumento,
  validateTemplateFields,
} from "@/lib/documenti/letterhead-field-catalog";
import {
  buildNumeroDocumentoLine,
  buildOggettoTitolo,
  mapDocumentoToPdfmeInputs,
} from "@/lib/documenti/map-documento-to-pdfme-inputs";
import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";

const sampleDoc: DocumentoArricchito = {
  tipoDocumento: "OFFERTA",
  destinatario: {
    ragioneSociale: "Cliente Test",
    aca: null,
    via: "Via 1",
    cap: "6500",
    citta: "Bellinzona",
    email: null,
    clienteId: null,
    isNuovo: false,
  },
  oggetto: "Progetto Alpha",
  corpoTesto: null,
  righe: [],
  condizioniPagamento: [],
  termineFornitura: null,
  note: null,
  totali: { totNetto: 0, iva: 0, totaleCHF: 0 },
  allegati: [],
};

describe("letterhead-field-catalog", () => {
  it("espone campi commerciali con numeroDocumento separato", () => {
    const fields = getFieldsForVariant("commercial");
    expect(fields.map((f) => f.id)).toContain("numeroDocumento");
    expect(fields.map((f) => f.id)).toContain("oggetto");
  });

  it("buildTemplateFromCatalog crea preset matris con campi default", () => {
    const template = buildTemplateFromCatalog(
      "https://example.com/base.pdf",
      "commercial",
      "matris",
    );
    expect(template.schemas[0]).toHaveProperty("numeroDocumento");
    expect(template.schemas[0]).toHaveProperty("tabellaRighe");
  });

  it("buildTemplateFromCatalog crea preset santini", () => {
    const template = buildTemplateFromCatalog(
      "https://example.com/base.pdf",
      "commercial",
      "santini",
    );
    const dest = template.schemas[0]?.destinatario as { position?: { x: number } };
    expect(dest?.position?.x).toBeGreaterThan(100);
  });

  it("validateTemplateFields segnala campi obbligatori mancanti", () => {
    const template = buildTemplateFromCatalog(
      "https://example.com/base.pdf",
      "commercial",
      "matris",
      ["data", "destinatario"],
    );
    const issues = validateTemplateFields(template, "commercial");
    expect(issues.some((i) => i.fieldId === "numeroDocumento")).toBe(true);
    expect(issues.some((i) => i.fieldId === "tabellaRighe")).toBe(true);
  });

  it("sanitizeTemplateWithCatalog rimuove campi non catalogati", () => {
    const template = buildTemplateFromCatalog(
      "https://example.com/base.pdf",
      "commercial",
      "matris",
    );
    template.schemas[0].campoLibero = { type: "text" } as never;
    const sanitized = sanitizeTemplateWithCatalog(template, "commercial");
    expect(sanitized.schemas[0]).not.toHaveProperty("campoLibero");
  });

  it("syncTemplateWithCatalog mantiene posizioni salvate", () => {
    const template = buildTemplateFromCatalog(
      "https://example.com/base.pdf",
      "commercial",
      "matris",
    );
    const customPos = {
      ...template.schemas[0].data,
      position: { x: 99, y: 99 },
    };
    const saved = { data: customPos as Record<string, unknown> };
    delete template.schemas[0].data;
    const synced = syncTemplateWithCatalog(
      template,
      "commercial",
      "matris",
      getDefaultEnabledFieldIds("commercial"),
      saved,
    );
    expect((synced.schemas[0].data as { position: { x: number } }).position.x).toBe(
      99,
    );
  });
});

describe("mapDocumentoToPdfmeInputs separate fields", () => {
  it("usa oggetto combinato senza numeroDocumento nel template", () => {
    const inputs = mapDocumentoToPdfmeInputs(sampleDoc, { numero: "26-1" });
    expect(inputs.oggetto).toContain("Offerta N°: 26-1");
    expect(inputs.numeroDocumento).toBeUndefined();
  });

  it("separa numero e titolo quando il template ha numeroDocumento", () => {
    const pdfmeTemplate = buildTemplateFromCatalog(
      "https://example.com/base.pdf",
      "commercial",
      "matris",
    );
    expect(templateHasSeparateNumeroDocumento(pdfmeTemplate)).toBe(true);

    const inputs = mapDocumentoToPdfmeInputs(sampleDoc, {
      numero: "26-128",
      pdfmeTemplate,
    });
    expect(inputs.numeroDocumento).toBe("Offerta N°: 26-128");
    expect(inputs.oggetto).toBe("Progetto Alpha");
    expect(buildNumeroDocumentoLine(sampleDoc, "26-128")).toBe(
      "Offerta N°: 26-128",
    );
    expect(buildOggettoTitolo(sampleDoc)).toBe("Progetto Alpha");
  });
});
