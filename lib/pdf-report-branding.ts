import sharp from "sharp";
import {
  rgb,
  type PDFImage,
  type PDFFont,
  type PDFPage,
} from "@pdfme/pdf-lib";

export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const PAGE_MARGIN = 40;
export const TOP_HEADER_HEIGHT = 92;
export const BOTTOM_MARGIN = 46;
export const BRAND = rgb(0.09, 0.13, 0.22);
export const BRAND_MUTED = rgb(0.35, 0.4, 0.5);
export const SOFT_BORDER = rgb(0.85, 0.88, 0.92);
export const SOFT_FILL = rgb(0.97, 0.98, 0.99);

export function formatReportDate(value?: string | Date | null): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("it-IT");
}

export function sanitizeReportFilename(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function wrapPdfText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  if (!text) return [""];

  const paragraphs = text.split(/\n+/);
  const lines: string[] = [];

  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      return;
    }

    let currentLine = words[0];
    for (let index = 1; index < words.length; index += 1) {
      const candidate = `${currentLine} ${words[index]}`;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = words[index];
      }
    }

    lines.push(currentLine);
  });

  return lines.length > 0 ? lines : [text];
}

export async function getPdfLogoBuffer(
  logoUrl?: string | null,
): Promise<Buffer | null> {
  if (!logoUrl) return null;

  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return await sharp(Buffer.from(arrayBuffer)).png().toBuffer();
  } catch {
    return null;
  }
}

export function drawPdfReportHeader(options: {
  page: PDFPage;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  siteName: string;
  title: string;
  documentCode: string;
  logoImage?: PDFImage | null;
  subtitle?: string;
}) {
  const {
    page,
    fontRegular,
    fontBold,
    siteName,
    title,
    documentCode,
    logoImage,
    subtitle,
  } = options;

  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - TOP_HEADER_HEIGHT,
    width: PAGE_WIDTH,
    height: TOP_HEADER_HEIGHT,
    color: BRAND,
  });

  if (logoImage) {
    const maxHeight = 38;
    const scale = maxHeight / logoImage.height;
    page.drawImage(logoImage, {
      x: PAGE_MARGIN,
      y: PAGE_HEIGHT - 60,
      width: logoImage.width * scale,
      height: maxHeight,
    });
  }

  const contentX = logoImage ? PAGE_MARGIN + 72 : PAGE_MARGIN;
  page.drawText(siteName, {
    x: contentX,
    y: PAGE_HEIGHT - 38,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(title, {
    x: contentX,
    y: PAGE_HEIGHT - 58,
    size: 10,
    font: fontRegular,
    color: rgb(0.9, 0.93, 0.98),
  });

  if (subtitle) {
    page.drawText(subtitle, {
      x: contentX,
      y: PAGE_HEIGHT - 72,
      size: 8,
      font: fontRegular,
      color: rgb(0.82, 0.87, 0.94),
    });
  }

  const codeWidth = fontBold.widthOfTextAtSize(documentCode, 14);
  page.drawText(documentCode, {
    x: PAGE_WIDTH - PAGE_MARGIN - codeWidth,
    y: PAGE_HEIGHT - 42,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
}

export function drawPdfFooter(options: {
  page: PDFPage;
  pageNumber: number;
  totalPages: number;
  fontRegular: PDFFont;
}) {
  const { page, pageNumber, totalPages, fontRegular } = options;
  const footerText = `Pagina ${pageNumber} / ${totalPages}`;
  const footerWidth = fontRegular.widthOfTextAtSize(footerText, 9);
  page.drawText(footerText, {
    x: PAGE_WIDTH - PAGE_MARGIN - footerWidth,
    y: 20,
    size: 9,
    font: fontRegular,
    color: BRAND_MUTED,
  });
  page.drawText(`Generato il ${formatReportDate(new Date())}`, {
    x: PAGE_MARGIN,
    y: 20,
    size: 9,
    font: fontRegular,
    color: BRAND_MUTED,
  });
}
