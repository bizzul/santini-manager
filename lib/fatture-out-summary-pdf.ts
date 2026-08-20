import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "@pdfme/pdf-lib";
import {
  PAGE_HEIGHT,
  PAGE_MARGIN,
  PAGE_WIDTH,
  wrapPdfText,
} from "@/lib/pdf-report-branding";

export type FattureOutSupplementLine = {
  description: string;
  quantity: number;
  price: number;
};

export type FattureOutSummaryRow = {
  uniqueCode: string;
  name: string;
  clientName: string;
  objectName: string;
  value: number;
  supplements: FattureOutSupplementLine[];
  comments: string;
  invoicingNotes: string;
  invoicingStatus: string;
  sameAsOffer: boolean;
};

export type FattureOutSummarySection = {
  title: string;
  rows: FattureOutSummaryRow[];
};

export type FattureOutSummaryPdfInput = {
  companyName: string;
  columnLabel: string;
  generatedAt?: Date;
  sections: FattureOutSummarySection[];
};

const INK = rgb(0.08, 0.1, 0.14);
const MUTED = rgb(0.35, 0.38, 0.42);
const BORDER = rgb(0.12, 0.14, 0.18);
const BOX_PAD = 8;
const GAP = 8;
const LINE = 12;
const LABEL_WIDTH = 92;

function toPdfText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ");
}

export function formatInvoiceChf(value: number): string {
  const amount = Number.isFinite(value) ? value : 0;
  const [whole, fraction] = amount.toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `CHF ${grouped}.${fraction}`;
}

export function formatSupplementLine(line: FattureOutSupplementLine): string {
  const qty = Number(line.quantity) || 0;
  const price = Number(line.price) || 0;
  const total = qty * price;
  return `${line.description}  ${qty} x ${formatInvoiceChf(price)} = ${formatInvoiceChf(total)}`;
}

export function sectionTotal(rows: FattureOutSummaryRow[]): number {
  return rows.reduce((sum, row) => sum + (row.value || 0), 0);
}

function formatSheetDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getFullYear()}`;
}

function drawBox(
  page: PDFPage,
  x: number,
  top: number,
  width: number,
  height: number,
) {
  page.drawRectangle({
    x,
    y: top - height,
    width,
    height,
    borderColor: BORDER,
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });
}

export async function buildFattureOutSummaryPdf(
  input: FattureOutSummaryPdfInput,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const valueWidth = contentWidth - BOX_PAD * 2 - LABEL_WIDTH;
  const generatedAt = input.generatedAt ?? new Date();
  const sections = input.sections ?? [];
  const allRows = sections.flatMap((section) => section.rows);
  const totalValue = sectionTotal(allRows);

  const wrap = (text: string, font: PDFFont, size: number, width: number) =>
    wrapPdfText(toPdfText(text || ""), font, size, width);

  const startPage = () => {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    return { page, y: PAGE_HEIGHT - PAGE_MARGIN };
  };

  let { page, y } = startPage();

  const ensureSpace = (needed: number) => {
    if (y - needed >= PAGE_MARGIN) return;
    ({ page, y } = startPage());
  };

  const drawText = (
    text: string,
    x: number,
    size: number,
    font: PDFFont,
    color = INK,
  ) => {
    page.drawText(toPdfText(text), {
      x,
      y,
      size,
      font,
      color,
    });
  };

  drawText("Riepilogo fatture", PAGE_MARGIN, 16, fontBold);
  y -= 18;
  drawText(
    `${input.companyName}  |  Colonna ${input.columnLabel}  |  ${formatSheetDate(generatedAt)}`,
    PAGE_MARGIN,
    9,
    fontRegular,
    MUTED,
  );
  y -= 14;
  drawText(
    `Pratiche: ${allRows.length}    Totale: ${formatInvoiceChf(totalValue)}`,
    PAGE_MARGIN,
    10,
    fontBold,
  );
  y -= 16;

  if (allRows.length === 0) {
    drawText(
      `Nessuna fattura in ${input.columnLabel}.`,
      PAGE_MARGIN,
      11,
      fontRegular,
      MUTED,
    );
    return pdfDoc.save();
  }

  const labeledLines = (
    row: FattureOutSummaryRow,
  ): Array<{ label: string; lines: string[] }> => {
    const supplementLines =
      row.supplements.length > 0
        ? row.supplements.map((line) => formatSupplementLine(line))
        : [row.sameAsOffer ? "Uguale all'offerta" : "-"];
    const invoicingBits = [
      row.invoicingStatus,
      row.sameAsOffer ? "Uguale all'offerta" : null,
      row.invoicingNotes.trim() || null,
    ].filter((item): item is string => Boolean(item));

    return [
      {
        label: "Nome:",
        lines: wrap(row.name || "-", fontRegular, 9, valueWidth),
      },
      {
        label: "Cliente:",
        lines: wrap(row.clientName || "-", fontRegular, 9, valueWidth),
      },
      {
        label: "Nome oggetto:",
        lines: wrap(row.objectName || "-", fontRegular, 9, valueWidth),
      },
      {
        label: "Valore:",
        lines: wrap(formatInvoiceChf(row.value), fontRegular, 9, valueWidth),
      },
      {
        label: "Supplementi:",
        lines: supplementLines.flatMap((line) =>
          wrap(line, fontRegular, 9, valueWidth),
        ),
      },
      {
        label: "Commenti:",
        lines: wrap(row.comments || "-", fontRegular, 9, valueWidth).slice(
          0,
          12,
        ),
      },
      {
        label: "Fatturazione:",
        lines: wrap(invoicingBits.join("  |  ") || "-", fontRegular, 9, valueWidth),
      },
    ];
  };

  const drawRow = (row: FattureOutSummaryRow) => {
    const fields = labeledLines(row);
    const fieldHeight = fields.reduce(
      (sum, field) => sum + Math.max(field.lines.length, 1) * LINE,
      0,
    );
    const headerHeight = LINE + 4;
    const boxHeight = BOX_PAD + headerHeight + fieldHeight + BOX_PAD;

    ensureSpace(boxHeight);
    drawBox(page, PAGE_MARGIN, y, contentWidth, boxHeight);

    let cursor = y - BOX_PAD - 10;
    const innerLeft = PAGE_MARGIN + BOX_PAD;
    page.drawText(toPdfText(row.uniqueCode || "-"), {
      x: innerLeft,
      y: cursor,
      size: 11,
      font: fontBold,
      color: INK,
    });
    const valueText = formatInvoiceChf(row.value);
    const valueWidthDrawn = fontBold.widthOfTextAtSize(valueText, 11);
    page.drawText(valueText, {
      x: PAGE_MARGIN + contentWidth - BOX_PAD - valueWidthDrawn,
      y: cursor,
      size: 11,
      font: fontBold,
      color: INK,
    });
    cursor -= headerHeight;

    for (const field of fields) {
      page.drawText(toPdfText(field.label), {
        x: innerLeft,
        y: cursor,
        size: 9,
        font: fontBold,
        color: INK,
      });
      const lines = field.lines.length > 0 ? field.lines : ["-"];
      lines.forEach((line, index) => {
        page.drawText(line, {
          x: innerLeft + LABEL_WIDTH,
          y: cursor - index * LINE,
          size: 9,
          font: fontRegular,
          color: INK,
        });
      });
      cursor -= Math.max(lines.length, 1) * LINE;
    }

    y -= boxHeight + GAP;
  };

  for (const section of sections) {
    ensureSpace(LINE * 3);
    drawText(section.title, PAGE_MARGIN, 12, fontBold);
    y -= 16;

    if (section.rows.length === 0) {
      drawText("Nessuna fattura in questa categoria.", PAGE_MARGIN, 9, fontRegular, MUTED);
      y -= 14;
    } else {
      for (const row of section.rows) {
        drawRow(row);
      }
    }

    ensureSpace(LINE * 2);
    drawText(
      `Totale ${section.title}: ${section.rows.length} pratiche    ${formatInvoiceChf(sectionTotal(section.rows))}`,
      PAGE_MARGIN,
      10,
      fontBold,
    );
    y -= 20;
  }

  return pdfDoc.save();
}
