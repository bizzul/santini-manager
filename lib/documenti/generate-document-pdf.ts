import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "@pdfme/pdf-lib";
import {
  BRAND,
  BRAND_MUTED,
  PAGE_HEIGHT,
  PAGE_MARGIN,
  PAGE_WIDTH,
  SOFT_BORDER,
  SOFT_FILL,
  TOP_HEADER_HEIGHT,
  drawPdfReportHeader,
  drawPdfFooter,
  formatReportDate,
  getPdfLogoBuffer,
  sanitizeReportFilename,
  wrapPdfText,
} from "@/lib/pdf-report-branding";
import type { DocumentTemplate } from "@/lib/documenti/template-types";
import { getDocumentTypeLabel } from "@/lib/documenti/document-types";
import { isCommercialType } from "@/lib/documenti/document-types";
import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";
import { drawFromStructureMap } from "@/lib/documenti/draw-structure-map-pdf";

interface RigheRow {
  art?: string | null;
  descrizione: string;
  misure?: string | null;
  unita?: string | null;
  quantita?: number | null;
  prezzo_unitario?: number | null;
  sconto?: number | null;
  totale_riga?: number | null;
}

interface PdfDocumentInput {
  documento: DocumentoArricchito;
  righe?: RigheRow[];
  template: DocumentTemplate;
  numero?: string | null;
  createdAt?: string | null;
}

type RigaPdfInput = RigheRow | DocumentoArricchito["righe"][number];

function getRigaPrezzo(riga: RigaPdfInput): number | null | undefined {
  return "prezzoUnitario" in riga
    ? riga.prezzoUnitario
    : (riga as RigheRow).prezzo_unitario;
}

function getRigaTotale(riga: RigaPdfInput): number | null | undefined {
  return "totaleRiga" in riga
    ? riga.totaleRiga
    : (riga as RigheRow).totale_riga;
}

function formatMoney(value?: number | null): string {
  const safe = Number(value ?? 0);
  return safe.toLocaleString("it-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function drawLetterheadFooter(
  page: PDFPage,
  fontRegular: PDFFont,
  template: DocumentTemplate,
  y: number,
): number {
  let cursorY = y;
  page.drawLine({
    start: { x: PAGE_MARGIN, y: cursorY },
    end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY },
    thickness: 0.5,
    color: SOFT_BORDER,
  });
  cursorY -= 14;
  page.drawText(template.banca.nome, {
    x: PAGE_MARGIN,
    y: cursorY,
    size: 9,
    font: fontRegular,
    color: BRAND_MUTED,
  });
  cursorY -= 12;
  page.drawText(`IBAN: ${template.banca.iban}`, {
    x: PAGE_MARGIN,
    y: cursorY,
    size: 9,
    font: fontRegular,
    color: BRAND_MUTED,
  });
  cursorY -= 12;
  page.drawText(`IVA: ${template.mittente.iva}`, {
    x: PAGE_MARGIN,
    y: cursorY,
    size: 8,
    font: fontRegular,
    color: BRAND_MUTED,
  });
  return cursorY;
}

export async function generateDocumentPdfBytes(
  input: PdfDocumentInput,
): Promise<{ bytes: Uint8Array; filename: string }> {
  const { documento, template, numero, createdAt } = input;
  const righe = input.righe ?? documento.righe;
  const isCommercial = isCommercialType(documento.tipoDocumento);

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const logoBuffer = await getPdfLogoBuffer(template.logoUrl);
  const logoImage = logoBuffer ? await pdfDoc.embedPng(logoBuffer) : null;

  const tipoLabel = getDocumentTypeLabel(documento.tipoDocumento);
  const docCode = numero ?? "—";
  const dataStr = formatReportDate(createdAt ?? new Date());

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - TOP_HEADER_HEIGHT - 24;

  drawPdfReportHeader({
    page,
    fontRegular,
    fontBold,
    siteName: template.mittente.ragioneSociale,
    title: tipoLabel,
    documentCode: docCode,
    logoImage,
    subtitle: `${template.mittente.via}, ${template.mittente.cap} ${template.mittente.citta}`,
  });

  // Destinatario block (right)
  const destLines = [
    "Spettabile",
    documento.destinatario.ragioneSociale,
    documento.destinatario.aca
      ? `a.c.a ${documento.destinatario.aca}`
      : null,
    documento.destinatario.via,
    [documento.destinatario.cap, documento.destinatario.citta]
      .filter(Boolean)
      .join(" "),
  ].filter(Boolean) as string[];

  let destY = y;
  destLines.forEach((line) => {
    const w = fontRegular.widthOfTextAtSize(line, 10);
    page.drawText(line, {
      x: PAGE_WIDTH - PAGE_MARGIN - w,
      y: destY,
      size: 10,
      font: fontRegular,
      color: BRAND,
    });
    destY -= 14;
  });

  y = Math.min(y, destY) - 20;

  page.drawText(`${tipoLabel} N°: ${docCode}  —  ${documento.oggetto}`, {
    x: PAGE_MARGIN,
    y,
    size: 11,
    font: fontBold,
    color: BRAND,
  });
  y -= 16;
  page.drawText(`Data: ${dataStr}`, {
    x: PAGE_MARGIN,
    y,
    size: 9,
    font: fontRegular,
    color: BRAND_MUTED,
  });
  y -= 24;

  if (template.structureMap?.sections?.length) {
    y = drawFromStructureMap({
      page,
      fontRegular,
      fontBold,
      structureMap: template.structureMap,
      documento,
      template,
      numero: docCode,
      dataStr,
      startY: y,
    });
  } else if (isCommercial && righe.length > 0) {
    const showDiscount = documento.tipoDocumento !== "FATTURA";
    const colWidths = showDiscount
      ? [36, 180, 28, 36, 52, 32, 52]
      : [36, 200, 28, 36, 52, 52];
    const headers = showDiscount
      ? ["Art.", "Descrizione", "U", "Q", "Prezzo", "%", "Totale"]
      : ["Art.", "Descrizione", "U", "Q", "Prezzo", "Totale"];

    let x = PAGE_MARGIN;
    page.drawRectangle({
      x: PAGE_MARGIN,
      y: y - 16,
      width: PAGE_WIDTH - PAGE_MARGIN * 2,
      height: 18,
      color: SOFT_FILL,
    });
    headers.forEach((h, i) => {
      page.drawText(h, {
        x: x + 4,
        y: y - 12,
        size: 8,
        font: fontBold,
        color: BRAND,
      });
      x += colWidths[i];
    });
    y -= 22;

    for (const riga of righe) {
      if (y < 120) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - PAGE_MARGIN - 20;
      }

      const desc =
        riga.misure && riga.misure.trim()
          ? `${riga.descrizione}\nMisure: ${riga.misure}`
          : riga.descrizione;
      const descLines = wrapPdfText(desc, fontRegular, 8, colWidths[1] - 8);
      const rowH = Math.max(18, descLines.length * 11 + 6);

      x = PAGE_MARGIN;
      const cells = [
        riga.art ?? "—",
        null,
        riga.unita ?? "—",
        String(riga.quantita ?? "—"),
        formatMoney(getRigaPrezzo(riga)),
        ...(showDiscount ? [riga.sconto != null ? `${riga.sconto}%` : "—"] : []),
        formatMoney(getRigaTotale(riga)),
      ];

      cells.forEach((cell, i) => {
        if (cell !== null) {
          page.drawText(cell, {
            x: x + 4,
            y: y - 12,
            size: 8,
            font: fontRegular,
            color: BRAND,
          });
        }
        x += colWidths[i];
      });

      descLines.forEach((line, li) => {
        page.drawText(line, {
          x: PAGE_MARGIN + colWidths[0] + 4,
          y: y - 12 - li * 11,
          size: 8,
          font: fontRegular,
          color: BRAND,
        });
      });

      y -= rowH;
    }

    y -= 12;
    const totali = documento.totali;
    if (totali) {
      const totalsX = PAGE_WIDTH - PAGE_MARGIN - 160;
      page.drawText(`Tot. Netto: CHF ${formatMoney(totali.totNetto)}`, {
        x: totalsX,
        y,
        size: 9,
        font: fontRegular,
        color: BRAND,
      });
      y -= 14;
      page.drawText(`IVA 8.1%: CHF ${formatMoney(totali.iva)}`, {
        x: totalsX,
        y,
        size: 9,
        font: fontRegular,
        color: BRAND,
      });
      y -= 14;
      page.drawText(`Totale CHF: ${formatMoney(totali.totaleCHF)}`, {
        x: totalsX,
        y,
        size: 10,
        font: fontBold,
        color: BRAND,
      });
      y -= 20;
    }

    if (documento.condizioniPagamento?.length) {
      page.drawText("Condizioni di pagamento:", {
        x: PAGE_MARGIN,
        y,
        size: 9,
        font: fontBold,
        color: BRAND,
      });
      y -= 14;
      documento.condizioniPagamento.forEach((c) => {
        page.drawText(c, {
          x: PAGE_MARGIN + 8,
          y,
          size: 9,
          font: fontRegular,
          color: BRAND,
        });
        y -= 12;
      });
    }

    if (documento.termineFornitura) {
      y -= 6;
      page.drawText(`Termine di fornitura: ${documento.termineFornitura}`, {
        x: PAGE_MARGIN,
        y,
        size: 9,
        font: fontRegular,
        color: BRAND,
      });
      y -= 16;
    }
  } else if (documento.corpoTesto) {
    const paragraphs = documento.corpoTesto.split(/\n\n+/);
    for (const para of paragraphs) {
      const lines = wrapPdfText(
        para.trim(),
        fontRegular,
        10,
        PAGE_WIDTH - PAGE_MARGIN * 2,
      );
      for (const line of lines) {
        if (y < 80) {
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - PAGE_MARGIN - 20;
        }
        page.drawText(line, {
          x: PAGE_MARGIN,
          y,
          size: 10,
          font: fontRegular,
          color: BRAND,
        });
        y -= 14;
      }
      y -= 8;
    }
  }

  if (y < 70) {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - PAGE_MARGIN - 20;
  }
  drawLetterheadFooter(page, fontRegular, template, y - 10);

  const pages = pdfDoc.getPages();
  pages.forEach((p, index) => {
    drawPdfFooter({
      page: p,
      pageNumber: index + 1,
      totalPages: pages.length,
      fontRegular,
    });
  });

  const bytes = await pdfDoc.save();
  const slug = sanitizeReportFilename(
    `${tipoLabel}-${docCode}-${documento.destinatario.ragioneSociale}`,
  );
  const filename = `${slug || "documento"}.pdf`;

  return { bytes, filename };
}
