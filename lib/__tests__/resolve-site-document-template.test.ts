import {
  buildDocumentTemplateConfigFromSite,
  getDocumentTemplateIssues,
  getDocumentTemplateMissingLabels,
  isDocumentTemplateConfigured,
  resolveSiteDocumentTemplate,
} from "@/lib/documenti/resolve-site-document-template";
import { buildTemplateFromCatalog } from "@/lib/documenti/default-pdfme-template";

describe("resolveSiteDocumentTemplate", () => {
  it("usa il nome del sito come fallback per ragione sociale", () => {
    const template = resolveSiteDocumentTemplate({
      name: "Santini Delbiaggio SA",
      document_template_config: {
        mittente: {
          ragioneSociale: "",
          via: "Via Moncucco 15",
          cap: "6512",
          citta: "Giubiasco",
          iva: "",
        },
      },
    });

    expect(template.mittente.ragioneSociale).toBe("Santini Delbiaggio SA");
    expect(template.pageFormat).toBe("A4");
  });

  it("segnala IVA e IBAN mancanti senza bloccare la ragione sociale", () => {
    const template = resolveSiteDocumentTemplate({
      name: "Santini Delbiaggio SA",
      document_template_config: {
        mittente: {
          ragioneSociale: "Santini Delbiaggio SA",
          via: "Via Moncucco 15",
          cap: "6512",
          citta: "Giubiasco",
          iva: "",
        },
        banca: { nome: "", iban: "" },
      },
    });

    expect(isDocumentTemplateConfigured(template)).toBe(false);
    expect(getDocumentTemplateMissingLabels(template)).toEqual([
      "Partita IVA",
      "IBAN",
      "Nome banca",
    ]);
    expect(getDocumentTemplateIssues(template).filter((i) => i.blocking)).toEqual([
      expect.objectContaining({ label: "IBAN", blocking: true }),
    ]);
  });

  it("buildDocumentTemplateConfigFromSite non sovrascrive dati salvati", () => {
    const config = buildDocumentTemplateConfigFromSite({
      name: "Nome Sito",
      document_template_config: {
        mittente: {
          ragioneSociale: "Azienda Configurata",
          via: "Via 1",
          cap: "6500",
          citta: "Bellinzona",
          iva: "CHE-999",
        },
        banca: { nome: "Banca", iban: "CH00" },
      },
    });

    expect(config.mittente?.ragioneSociale).toBe("Azienda Configurata");
    expect(config.banca?.iban).toBe("CH00");
  });

  it("segnala designer mancante se caricato solo lo sfondo", () => {
    const template = resolveSiteDocumentTemplate({
      name: "Test SA",
      document_template_config: {
        letterheadBasePdf: {
          url: "https://example.com/base.pdf",
          storagePath: "site/letterhead/base.pdf",
          mimeType: "application/pdf",
        },
        mittente: {
          ragioneSociale: "Test SA",
          via: "Via 1",
          cap: "6500",
          citta: "Bellinzona",
          iva: "CHE-123",
        },
        banca: { nome: "Banca", iban: "CH00" },
      },
    });

    expect(isDocumentTemplateConfigured(template)).toBe(false);
    expect(getDocumentTemplateMissingLabels(template, { blockingOnly: true })).toContain(
      "Posizionamento campi carta intestata (Designer)",
    );
  });

  it("considera configurato un overlay pdfme completo", () => {
    const pdfmeTemplate = buildTemplateFromCatalog(
      "https://example.com/base.pdf",
      "commercial",
      "matris",
    );
    const template = resolveSiteDocumentTemplate({
      name: "Test SA",
      document_template_config: {
        letterheadBasePdf: {
          url: "https://example.com/base.pdf",
          storagePath: "site/letterhead/base.pdf",
          mimeType: "application/pdf",
        },
        pdfmeTemplate,
        mittente: {
          ragioneSociale: "Test SA",
          via: "Via 1",
          cap: "6500",
          citta: "Bellinzona",
          iva: "CHE-123",
        },
        banca: { nome: "Banca", iban: "CH00" },
      },
    });

    expect(isDocumentTemplateConfigured(template)).toBe(true);
  });
});
