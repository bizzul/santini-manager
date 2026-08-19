import { inflateSync } from "node:zlib";
import {
  buildFattureOutSummaryPdf,
  formatInvoiceChf,
  formatSupplementLine,
} from "@/lib/fatture-out-summary-pdf";

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

function visiblePdfText(bytes: Uint8Array): string {
  const content = pdfContentText(bytes);
  const hexText: string[] = [];
  const hexRe = /<([0-9A-Fa-f]+)>/g;
  let hexMatch = hexRe.exec(content);
  while (hexMatch) {
    hexText.push(Buffer.from(hexMatch[1], "hex").toString("latin1"));
    hexMatch = hexRe.exec(content);
  }
  return hexText.join("\n");
}

describe("fatture-out-summary-pdf", () => {
  it("formats Swiss currency with ASCII separators", () => {
    expect(formatInvoiceChf(1600)).toBe("CHF 1'600.00");
    expect(formatInvoiceChf(0)).toBe("CHF 0.00");
  });

  it("formats supplement lines with quantity and totals", () => {
    expect(
      formatSupplementLine({
        description: "Trasporto",
        quantity: 2,
        price: 50,
      }),
    ).toBe("Trasporto  2 x CHF 50.00 = CHF 100.00");
  });

  it("prints stacked invoice fields for administration", async () => {
    const bytes = await buildFattureOutSummaryPdf({
      companyName: "Santini SA",
      generatedAt: new Date(2026, 7, 19),
      rows: [
        {
          uniqueCode: "26-035-FATT",
          name: "Commessa FFS",
          clientName: "Ferrovie Federali Svizzere FFS",
          objectName: "Porte piano 2",
          value: 1600,
          supplements: [
            { description: "Trasporto", quantity: 1, price: 80 },
          ],
          comments: "Attendere conferma misure.",
          invoicingNotes: "Fatturare acconto 30%.",
          invoicingStatus: "Pronto",
          sameAsOffer: false,
        },
        {
          uniqueCode: "26-040-FATT",
          name: "Armadio nicchia",
          clientName: "Tedeschi Antonietta",
          objectName: "Armadio nicchia",
          value: 2400,
          supplements: [],
          comments: "",
          invoicingNotes: "",
          invoicingStatus: "In attesa",
          sameAsOffer: true,
        },
      ],
    });

    expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe("%PDF");
    const visible = visiblePdfText(bytes);
    expect(visible).toContain("Riepilogo fatture");
    expect(visible).toContain("Colonna To Do");
    expect(visible).toContain("26-035-FATT");
    expect(visible).toContain("Nome:");
    expect(visible).toContain("Commessa FFS");
    expect(visible).toContain("Cliente:");
    expect(visible).toContain("Nome oggetto:");
    expect(visible).toContain("Porte piano 2");
    expect(visible).toContain("Supplementi:");
    expect(visible).toContain("Trasporto");
    expect(visible).toContain("Commenti:");
    expect(visible).toContain("Fatturazione:");
    expect(visible).toContain("Pronto");
    expect(visible).toContain("Fatturare acconto 30%.");
    expect(visible).toContain("Uguale all'offerta");
    expect(visible).toContain("26-040-FATT");
  });
});
