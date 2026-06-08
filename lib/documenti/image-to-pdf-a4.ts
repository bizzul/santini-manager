import sharp from "sharp";
import { PDFDocument } from "@pdfme/pdf-lib";

/** A4 in PDF points (72 dpi). */
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const PAGE_MARGIN_PT = 0;

/**
 * Converte un'immagine in un PDF A4 single-page (sfondo carta intestata).
 */
export async function imageBufferToPdfA4(imageBuffer: Buffer): Promise<Uint8Array> {
  const pngBuffer = await sharp(imageBuffer)
    .png()
    .toBuffer();

  const metadata = await sharp(pngBuffer).metadata();
  const imgWidth = metadata.width ?? 1;
  const imgHeight = metadata.height ?? 1;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);

  const availableWidth = A4_WIDTH_PT - PAGE_MARGIN_PT * 2;
  const availableHeight = A4_HEIGHT_PT - PAGE_MARGIN_PT * 2;
  const scale = Math.min(
    availableWidth / imgWidth,
    availableHeight / imgHeight,
  );
  const drawWidth = imgWidth * scale;
  const drawHeight = imgHeight * scale;
  const x = (A4_WIDTH_PT - drawWidth) / 2;
  const y = (A4_HEIGHT_PT - drawHeight) / 2;

  const embedded = await pdfDoc.embedPng(pngBuffer);
  page.drawImage(embedded, {
    x,
    y,
    width: drawWidth,
    height: drawHeight,
  });

  return pdfDoc.save();
}

export async function readPdfMetadata(
  bytes: Uint8Array,
): Promise<{ pages: number; widthPt: number; heightPt: number }> {
  const pdfDoc = await PDFDocument.load(bytes);
  const firstPage = pdfDoc.getPages()[0];
  const { width, height } = firstPage.getSize();
  return { pages: pdfDoc.getPageCount(), widthPt: width, heightPt: height };
}

export async function normalizeLetterheadToPdf(
  file: File,
): Promise<{ bytes: Uint8Array; mimeType: string; pages: number; widthPt: number; heightPt: number }> {
  if (file.type === "application/pdf") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const meta = await readPdfMetadata(bytes);
    return { bytes, mimeType: "application/pdf", ...meta };
  }

  if (file.type.startsWith("image/")) {
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const bytes = await imageBufferToPdfA4(imageBuffer);
    const meta = await readPdfMetadata(bytes);
    return { bytes, mimeType: "application/pdf", ...meta };
  }

  throw new Error("Formato non supportato. Usa PDF, JPEG o PNG.");
}

/** Converte punti PDF in mm (1 pt = 0.352778 mm). */
export function ptToMm(pt: number): number {
  return Math.round(pt * 0.352778 * 10) / 10;
}
