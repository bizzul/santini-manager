import {
  buildTemplateFromAiLayouts,
  buildTemplateFromCatalog,
} from "@/lib/documenti/letterhead-field-catalog";
import { mergePdfTextRegions } from "@/lib/documenti/extract-pdf-text-regions";

describe("buildTemplateFromAiLayouts", () => {
  it("applica coordinate AI ai campi del catalogo", () => {
    const template = buildTemplateFromAiLayouts(
      "https://example.com/base.pdf",
      "commercial",
      "matris",
      [
        {
          fieldId: "data",
          position: { x: 150, y: 40 },
          width: 45,
          height: 8,
          fontSize: 10,
          alignment: "right",
        },
        {
          fieldId: "oggetto",
          position: { x: 20, y: 80 },
          width: 170,
          height: 10,
        },
      ],
    );

    const data = template.schemas[0]?.data as {
      position?: { x: number; y: number };
      alignment?: string;
    };
    expect(data?.position?.x).toBe(150);
    expect(data?.alignment).toBe("right");
    expect(template.schemas[0]).toHaveProperty("tabellaRighe");
  });

  it("include campi default mancanti dall'AI", () => {
    const aiOnly = buildTemplateFromAiLayouts(
      "https://example.com/base.pdf",
      "commercial",
      "matris",
      [{ fieldId: "data", position: { x: 1, y: 2 }, width: 10, height: 5 }],
    );
    const preset = buildTemplateFromCatalog(
      "https://example.com/base.pdf",
      "commercial",
      "matris",
    );
    expect(Object.keys(aiOnly.schemas[0] ?? {}).length).toBeGreaterThanOrEqual(
      Object.keys(preset.schemas[0] ?? {}).length,
    );
  });
});

describe("mergePdfTextRegions", () => {
  it("unisce righe sulla stessa baseline", () => {
    const merged = mergePdfTextRegions([
      { text: "Offerta", x: 10, y: 70, width: 20, height: 4 },
      { text: "N°: 26-1", x: 32, y: 70.5, width: 25, height: 4 },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.text).toContain("Offerta");
    expect(merged[0]?.text).toContain("26-1");
  });
});
