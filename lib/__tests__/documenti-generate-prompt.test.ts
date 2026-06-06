import {
  buildGenerateSystemPrompt,
  buildGenerateUserPrompt,
} from "@/lib/documenti/generate-prompt";
import type { DocumentTemplate } from "@/lib/documenti/template-types";
import { DEFAULT_MATRIS_TEMPLATE } from "@/lib/documenti/template-types";
import type { GenerateDocumentRequest } from "@/validation/documenti/extracted-document";

const baseInput: GenerateDocumentRequest = {
  tipoDocumento: "OFFERTA",
  destinatario: {
    tipo: "cliente",
    entityId: 1,
    ragioneSociale: "Cliente Test SA",
    aca: "M. Rossi",
    via: "Via Roma 1",
    cap: "6500",
    citta: "Bellinzona",
    email: "test@example.ch",
  },
  oggetto: "Fornitura infissi",
  testo: "3 finestre in alluminio, prezzo indicativo 1200 CHF cad.",
  allegati: [],
};

describe("generate-prompt", () => {
  it("includes type-specific instructions for commercial documents", () => {
    const prompt = buildGenerateSystemPrompt("OFFERTA");
    expect(prompt).toContain("Offerta");
    expect(prompt).toContain("NON calcolare mai");
    expect(prompt).toContain("ricerche database");
  });

  it("includes prose instructions for letter documents", () => {
    const prompt = buildGenerateSystemPrompt("LETTERA_UFFICIALE");
    expect(prompt).toContain("Lettera ufficiale");
    expect(prompt).toContain("corpoTesto");
    expect(prompt).toContain("NON usare tabelle articoli");
  });

  it("builds user prompt with destinatario and testo", () => {
    const userPrompt = buildGenerateUserPrompt(baseInput, "6 giugno 2026");
    expect(userPrompt).toContain("Cliente Test SA");
    expect(userPrompt).toContain("Fornitura infissi");
    expect(userPrompt).toContain("3 finestre in alluminio");
    expect(userPrompt).toContain("6 giugno 2026");
  });

  it("includes structureMap in system prompt when present", () => {
    const template: DocumentTemplate = {
      ...DEFAULT_MATRIS_TEMPLATE,
      structureMap: {
        sections: [
          {
            id: "destinatario",
            label: "Destinatario",
            order: 1,
            fields: [
              {
                placeholderId: "destinatario_nome",
                label: "Nome destinatario",
                type: "text",
                order: 1,
              },
            ],
          },
        ],
      },
    };
    const prompt = buildGenerateSystemPrompt("OFFERTA", template);
    expect(prompt).toContain("VINCOLI LAYOUT DA MODELLO AZIENDALE");
    expect(prompt).toContain("destinatario_nome");
  });

  it("mentions allegati when present", () => {
    const withFiles: GenerateDocumentRequest = {
      ...baseInput,
      allegati: [
        {
          name: "planimetria.pdf",
          url: "https://example.com/plan.pdf",
          storagePath: "site/temp/plan.pdf",
        },
      ],
    };
    const userPrompt = buildGenerateUserPrompt(withFiles, "oggi");
    expect(userPrompt).toContain("planimetria.pdf");
  });
});
