import {
  getDocumentTypeTemplateEntry,
  isDocumentTypeTemplateConfigured,
  listConfiguredDocumentTypes,
  mergeDocumentTypeTemplateEntry,
} from "@/lib/documenti/document-type-template";
import { buildTemplateFromCatalog } from "@/lib/documenti/default-pdfme-template";

describe("document-type-template", () => {
  it("preferisce entry per-tipo rispetto al legacy", () => {
    const legacy = buildTemplateFromCatalog(
      "https://example.com/legacy.pdf",
      "commercial",
      "matris",
    );
    const specific = buildTemplateFromCatalog(
      "https://example.com/fattura.pdf",
      "commercial",
      "matris",
    );

    const config = {
      letterheadBasePdf: {
        url: "https://example.com/legacy.pdf",
        storagePath: "legacy.pdf",
        mimeType: "application/pdf",
      },
      pdfmeTemplate: legacy,
      templatesByType: {
        FATTURA: {
          letterheadBasePdf: {
            url: "https://example.com/fattura.pdf",
            storagePath: "fattura.pdf",
            mimeType: "application/pdf",
          },
          pdfmeTemplate: specific,
        },
      },
    };

    expect(getDocumentTypeTemplateEntry(config, "FATTURA")?.pdfmeTemplate).toBe(
      specific,
    );
    expect(getDocumentTypeTemplateEntry(config, "OFFERTA")?.pdfmeTemplate).toBe(
      legacy,
    );
  });

  it("mergeDocumentTypeTemplateEntry aggiorna solo il tipo indicato", () => {
    const base = mergeDocumentTypeTemplateEntry({}, "OFFERTA", {
      letterheadLayoutPreset: "matris",
    });
    const withFattura = mergeDocumentTypeTemplateEntry(base, "FATTURA", {
      letterheadLayoutPreset: "matris",
    });

    expect(withFattura.templatesByType?.OFFERTA?.letterheadLayoutPreset).toBe(
      "matris",
    );
    expect(withFattura.templatesByType?.FATTURA?.letterheadLayoutPreset).toBe(
      "matris",
    );
  });

  it("isDocumentTypeTemplateConfigured rileva overlay completo", () => {
    const pdfme = buildTemplateFromCatalog(
      "https://example.com/base.pdf",
      "commercial",
      "matris",
    );
    const config = mergeDocumentTypeTemplateEntry({}, "OFFERTA", {
      letterheadBasePdf: {
        url: "https://example.com/base.pdf",
        storagePath: "base.pdf",
        mimeType: "application/pdf",
      },
      pdfmeTemplate: pdfme,
    });

    expect(isDocumentTypeTemplateConfigured(config, "OFFERTA")).toBe(true);
    expect(isDocumentTypeTemplateConfigured(config, "FATTURA")).toBe(false);
    expect(listConfiguredDocumentTypes(config)).toEqual(["OFFERTA"]);
  });
});
