import { inflateSync } from "node:zlib";
import { resolvePdfLogoBuffer } from "@/lib/pdf-report-branding";
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
      columnLabel: "To Do",
      generatedAt: new Date(2026, 7, 19),
      sections: [
        {
          title: "Pronte",
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
          ],
        },
        {
          title: "Non pronte",
          rows: [
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
    expect(visible).toContain("Pronte");
    expect(visible).toContain("Non pronte");
    expect(visible).toContain("Totale Pronte");
    expect(visible).toContain("Totale Non pronte");
  });

  it("prints expired invoices before non-expired ones with category totals", async () => {
    const bytes = await buildFattureOutSummaryPdf({
      companyName: "Santini SA",
      columnLabel: "Inviate",
      generatedAt: new Date(2026, 7, 20),
      sections: [
        {
          title: "Scadute",
          rows: [
            {
              uniqueCode: "26-066-FATT",
              name: "Fattura scaduta",
              clientName: "Cliente A",
              objectName: "Oggetto A",
              value: 1000,
              supplements: [],
              comments: "",
              invoicingNotes: "",
              invoicingStatus: "Pronto",
              sameAsOffer: true,
            },
          ],
        },
        {
          title: "Non scadute",
          rows: [
            {
              uniqueCode: "26-070-FATT",
              name: "Fattura aperta",
              clientName: "Cliente B",
              objectName: "Oggetto B",
              value: 2500,
              supplements: [],
              comments: "",
              invoicingNotes: "",
              invoicingStatus: "Pronto",
              sameAsOffer: true,
            },
          ],
        },
      ],
    });

    const visible = visiblePdfText(bytes);
    expect(visible).toContain("Colonna Inviate");
    expect(visible.indexOf("Scadute")).toBeLessThan(visible.indexOf("Non scadute"));
    expect(visible.indexOf("26-066-FATT")).toBeLessThan(visible.indexOf("26-070-FATT"));
    expect(visible).toContain("Totale Scadute");
    expect(visible).toContain("Totale Non scadute");
    expect(visible).toContain("CHF 1'000.00");
    expect(visible).toContain("CHF 2'500.00");
  });

  it("embeds the Santini logo in the top-right header", async () => {
    const logoBytes = await resolvePdfLogoBuffer({
      companyName: "Santini SA",
      subdomain: "santini",
    });
    expect(logoBytes?.length).toBeGreaterThan(1000);

    const bytes = await buildFattureOutSummaryPdf({
      companyName: "Santini SA",
      columnLabel: "Inviate",
      generatedAt: new Date(2026, 7, 20),
      sections: [
        {
          title: "Scadute",
          rows: [
            {
              uniqueCode: "26-066-FATT",
              name: "Fattura scaduta",
              clientName: "Cliente A",
              objectName: "Oggetto A",
              value: 1000,
              supplements: [],
              comments: "",
              invoicingNotes: "",
              invoicingStatus: "Pronto",
              sameAsOffer: true,
            },
          ],
        },
      ],
      logoBytes: logoBytes ? Uint8Array.from(logoBytes) : null,
    });

    const raw = Buffer.from(bytes).toString("latin1");
    expect(raw).toContain("/XObject");
    expect(raw).toMatch(/\/Subtype\s*\/Image/);
  });
});
