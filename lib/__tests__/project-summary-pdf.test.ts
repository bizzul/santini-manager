import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildProjectSummaryPdf } from "@/lib/project-summary-pdf";

describe("buildProjectSummaryPdf", () => {
  it("generates a PDF with anagrafica, value, documents and comments", async () => {
    const bytes = await buildProjectSummaryPdf({
      siteName: "Santini SA",
      uniqueCode: "26-047",
      projectName: "Residenza Arianna",
      clientName: "Fondazione Molo",
      categoryName: "Arredamento",
      statusLabel: "In produzione",
      createdAt: "2026-03-12T09:00:00.000Z",
      deliveryDate: "2026-09-01T00:00:00.000Z",
      sellPrice: 18400,
      documents: [
        { tipo: "Offerta", date: "2026-03-13T10:00:00.000Z" },
        { tipo: "Conferma d'ordine", date: "2026-04-02T10:00:00.000Z" },
      ],
      comments: "Allineamento misure cucina confermato in cantiere.",
    });

    expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe("%PDF");
    expect(bytes.byteLength).toBeGreaterThan(1000);

    const outputPath = join(tmpdir(), "FDM-RiepilogoProgetto-esempio.pdf");
    writeFileSync(outputPath, Buffer.from(bytes));
    expect(outputPath).toContain("RiepilogoProgetto");
  });
});
