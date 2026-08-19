import { writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolvePdfLogoBuffer } from "@/lib/pdf-report-branding";
import {
  buildProjectSummaryPdf,
  formatSheetDate,
} from "@/lib/project-summary-pdf";

function pdfContentText(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString("binary");
  const parts: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match = streamRe.exec(raw);
  while (match) {
    try {
      parts.push(inflateSync(Buffer.from(match[1], "binary")).toString("latin1"));
    } catch {
      parts.push(match[1]);
    }
    match = streamRe.exec(raw);
  }
  return parts.join("\n");
}

describe("buildProjectSummaryPdf", () => {
  it("formats dates as DD.MM.YYYY", () => {
    expect(formatSheetDate("2026-08-25")).toBe("25.08.2026");
    expect(formatSheetDate(null)).toBe("");
  });

  it("generates an operational sheet without commercial sections", async () => {
    const bytes = await buildProjectSummaryPdf({
      uniqueCode: "26-150",
      projectName: "Villa delle Rose",
      companyName: "Matris pro SA",
      products: ["Armadio su misura", "Mobile cucina pensile"],
      productionDate: "2026-08-25",
      installationDate: "2026-09-12",
      siteAddress: "Via Cantonale 6, 6900 Lugano",
      contactName: "Marco Rossi",
      contactPhone: "079 800 52 52",
      productionComments: "Verificare misure nicchia.",
      installationComments: "Accesso cantiere dal cancello nord.",
    });

    expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe("%PDF");
    const content = pdfContentText(bytes);
    const hexText: string[] = [];
    const hexRe = /<([0-9A-Fa-f]+)>/g;
    let hexMatch = hexRe.exec(content);
    while (hexMatch) {
      hexText.push(Buffer.from(hexMatch[1], "hex").toString("latin1"));
      hexMatch = hexRe.exec(content);
    }
    const visible = hexText.join("\n");
    expect(visible).toContain("Commenti produzione");
    expect(visible).toContain("Commenti posa");
    expect(visible).toContain("26-150");
    expect(visible).toContain("Prodotti:");
    expect(visible).toContain("25.08.2026");
    expect(visible).not.toContain("Riepilogo economico");
    expect(visible).not.toContain("Documenti collegati");
    expect(visible).not.toContain("Riepilogo progetto");

    const outputPath = join(tmpdir(), "FDM-SchedaProgetto-esempio.pdf");
    writeFileSync(outputPath, Buffer.from(bytes));
  });

  it("generates a valid PDF when products and comments are empty", async () => {
    const bytes = await buildProjectSummaryPdf({
      uniqueCode: "26-001",
      projectName: "Progetto vuoto",
      companyName: "Santini SA",
      products: [],
      productionDate: null,
      installationDate: null,
      siteAddress: "",
      contactName: "",
      contactPhone: "",
      productionComments: "",
      installationComments: "",
    });
    expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe("%PDF");
  });

  it("embeds the Santini logo in the sheet header", async () => {
    const logoBytes = await resolvePdfLogoBuffer({
      companyName: "Santini SA",
      subdomain: "santini",
    });
    expect(logoBytes?.length).toBeGreaterThan(1000);

    const bytes = await buildProjectSummaryPdf({
      uniqueCode: "26-056",
      projectName: "Residenza Arianna",
      companyName: "Santini SA",
      products: ["Porta interna"],
      productionDate: null,
      installationDate: "2026-06-22",
      siteAddress: "Giubiasco",
      contactName: "F.lli Pasta SA",
      contactPhone: "",
      productionComments: "",
      installationComments: "",
      logoBytes: logoBytes ? Uint8Array.from(logoBytes) : null,
    });

    const raw = Buffer.from(bytes).toString("latin1");
    expect(raw).toContain("/XObject");
    expect(raw).toMatch(/\/Subtype\s*\/Image/);
    expect(pdfContentText(bytes)).not.toContain("Santini SA");
  });
});
