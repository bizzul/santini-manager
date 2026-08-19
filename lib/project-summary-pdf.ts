import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "@pdfme/pdf-lib";
import {
  BOTTOM_MARGIN,
  BRAND,
  BRAND_MUTED,
  PAGE_HEIGHT,
  PAGE_MARGIN,
  PAGE_WIDTH,
  SOFT_BORDER,
  SOFT_FILL,
  TOP_HEADER_HEIGHT,
  drawPdfFooter,
  drawPdfReportHeader,
  formatReportDate,
  wrapPdfText,
} from "@/lib/pdf-report-branding";

export type ProjectSummaryDocumentRow = {
  tipo: string;
  date: string | null;
};

export type ProjectSummaryPdfInput = {
  siteName: string;
  uniqueCode: string;
  projectName: string;
  clientName: string;
  categoryName: string;
  statusLabel: string;
  createdAt: string | null;
  deliveryDate: string | null;
  sellPrice: number | null;
  documents: ProjectSummaryDocumentRow[];
  comments: string | null;
  logoBytes?: Uint8Array | null;
};

function toPdfText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ");
}

function formatMoney(value: number): string {
  return `CHF ${value.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fitRightText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const safe = toPdfText(text);
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) return safe;
  let truncated = safe;
  while (
    truncated.length > 1 &&
    font.widthOfTextAtSize(`${truncated}...`, size) > maxWidth
  ) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}...`;
}

export async function buildProjectSummaryPdf(
  input: ProjectSummaryPdfInput,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let logoImage: PDFImage | null = null;
  if (input.logoBytes && input.logoBytes.byteLength > 0) {
    logoImage = await pdfDoc.embedPng(input.logoBytes);
  }
  const pages: PDFPage[] = [];
  const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2;

  const startPage = () => {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const rightText = fitRightText(
      `${input.uniqueCode}  ${input.clientName}`,
      fontBold,
      11,
      260,
    );
    drawPdfReportHeader({
      page,
      fontRegular,
      fontBold,
      siteName: "Riepilogo progetto",
      title: toPdfText(input.projectName || input.uniqueCode),
      documentCode: rightText,
      logoImage,
      subtitle: toPdfText(input.siteName),
    });
    pages.push(page);
    return { page, y: PAGE_HEIGHT - TOP_HEADER_HEIGHT - 28 };
  };

  let { page, y } = startPage();

  const ensureSpace = (needed: number) => {
    if (y - needed >= BOTTOM_MARGIN) return;
    ({ page, y } = startPage());
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(28);
    page.drawText(toPdfText(title), {
      x: PAGE_MARGIN,
      y,
      size: 12,
      font: fontBold,
      color: BRAND,
    });
    y -= 18;
  };

  const drawFieldRow = (
    fields: Array<{ label: string; value: string }>,
  ) => {
    const colWidth = contentWidth / fields.length;
    const valueLines = fields.map((field) =>
      wrapPdfText(toPdfText(field.value || "-"), fontBold, 11, colWidth - 8),
    );
    const rowHeight = Math.max(
      36,
      Math.max(...valueLines.map((lines) => lines.length)) * 13 + 18,
    );
    ensureSpace(rowHeight + 8);

    fields.forEach((field, index) => {
      const x = PAGE_MARGIN + index * colWidth;
      page.drawText(toPdfText(field.label).toUpperCase(), {
        x,
        y,
        size: 8,
        font: fontBold,
        color: BRAND_MUTED,
      });
      valueLines[index].forEach((line, lineIndex) => {
        page.drawText(line, {
          x,
          y: y - 14 - lineIndex * 13,
          size: 11,
          font: fontBold,
          color: BRAND,
        });
      });
    });
    y -= rowHeight;
  };

  drawSectionTitle("Dati progetto");
  drawFieldRow([
    { label: "Cliente", value: input.clientName || "-" },
    { label: "Categoria", value: input.categoryName || "Senza categoria" },
    { label: "Stato", value: input.statusLabel || "-" },
  ]);
  drawFieldRow([
    { label: "Data creazione", value: formatReportDate(input.createdAt) },
    { label: "Data prevista", value: formatReportDate(input.deliveryDate) },
    { label: "Numero", value: input.uniqueCode || "-" },
  ]);

  if (input.sellPrice != null) {
    y -= 8;
    drawSectionTitle("Riepilogo economico");
    ensureSpace(40);
    page.drawRectangle({
      x: PAGE_MARGIN,
      y: y - 22,
      width: 220,
      height: 32,
      color: SOFT_FILL,
      borderWidth: 1,
      borderColor: SOFT_BORDER,
    });
    page.drawText("VALORE", {
      x: PAGE_MARGIN + 8,
      y: y - 4,
      size: 8,
      font: fontBold,
      color: BRAND_MUTED,
    });
    page.drawText(toPdfText(formatMoney(Number(input.sellPrice))), {
      x: PAGE_MARGIN + 8,
      y: y - 18,
      size: 12,
      font: fontBold,
      color: BRAND,
    });
    y -= 44;
  }

  y -= 4;
  drawSectionTitle("Documenti collegati");
  if (input.documents.length === 0) {
    ensureSpace(18);
    page.drawText("Nessun documento commerciale collegato.", {
      x: PAGE_MARGIN,
      y,
      size: 10,
      font: fontRegular,
      color: BRAND_MUTED,
    });
    y -= 18;
  } else {
    input.documents.forEach((document) => {
      const line = `${document.tipo}  ·  ${formatReportDate(document.date)}`;
      const wrapped = wrapPdfText(toPdfText(line), fontRegular, 10, contentWidth - 12);
      const height = wrapped.length * 13 + 10;
      ensureSpace(height);
      page.drawRectangle({
        x: PAGE_MARGIN,
        y: y - height + 8,
        width: contentWidth,
        height,
        borderWidth: 1,
        borderColor: SOFT_BORDER,
        color: rgb(1, 1, 1),
      });
      wrapped.forEach((text, index) => {
        page.drawText(text, {
          x: PAGE_MARGIN + 8,
          y: y - 6 - index * 13,
          size: 10,
          font: fontRegular,
          color: BRAND,
        });
      });
      y -= height + 4;
    });
  }

  y -= 6;
  drawSectionTitle("Commenti");
  const commentText = input.comments?.trim()
    ? input.comments
    : "Nessun commento.";
  const commentLines = wrapPdfText(
    toPdfText(commentText),
    fontRegular,
    10,
    contentWidth - 16,
  );

  let remaining = [...commentLines];
  while (remaining.length > 0) {
    const available = y - BOTTOM_MARGIN - 12;
    const maxLines = Math.max(1, Math.floor((available - 16) / 13));
    const chunk = remaining.slice(0, maxLines);
    remaining = remaining.slice(maxLines);
    const height = Math.max(28, chunk.length * 13 + 16);
    ensureSpace(height);
    page.drawRectangle({
      x: PAGE_MARGIN,
      y: y - height + 8,
      width: contentWidth,
      height,
      borderWidth: 1,
      borderColor: SOFT_BORDER,
      color: SOFT_FILL,
    });
    chunk.forEach((line, index) => {
      page.drawText(line, {
        x: PAGE_MARGIN + 8,
        y: y - 8 - index * 13,
        size: 10,
        font: fontRegular,
        color: BRAND,
      });
    });
    y -= height + 6;
  }

  pages.forEach((currentPage, index) => {
    drawPdfFooter({
      page: currentPage,
      pageNumber: index + 1,
      totalPages: pages.length,
      fontRegular,
    });
  });

  return pdfDoc.save();
}
