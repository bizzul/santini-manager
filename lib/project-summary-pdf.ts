import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "@pdfme/pdf-lib";
import {
  PAGE_HEIGHT,
  PAGE_MARGIN,
  PAGE_WIDTH,
  wrapPdfText,
} from "@/lib/pdf-report-branding";
import { parseLocalDate } from "@/lib/utils";

/** Operational project sheet (produzione/posa). Not the old commercial summary. */
export type ProjectSheetPdfInput = {
  uniqueCode: string;
  projectName: string;
  companyName: string;
  products: string[];
  productionDate: string | null;
  installationDate: string | null;
  siteAddress: string;
  contactName: string;
  contactPhone: string;
  productionComments: string;
  installationComments: string;
  logoBytes?: Uint8Array | null;
};

const INK = rgb(0.08, 0.1, 0.14);
const BORDER = rgb(0.12, 0.14, 0.18);
const BOX_PAD = 12;
const GAP = 10;
const LABEL_WIDTH = 118;
const MIN_COMMENT_BOX = 150;
const LINE = 13;

function toPdfText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ");
}

export function formatSheetDate(value?: string | Date | null): string {
  if (!value) return "";
  const date =
    value instanceof Date
      ? value
      : parseLocalDate(typeof value === "string" ? value : String(value));
  if (Number.isNaN(date.getTime())) return "";
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

export async function buildProjectSummaryPdf(
  input: ProjectSheetPdfInput,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let logoImage: PDFImage | null = null;
  if (input.logoBytes && input.logoBytes.byteLength > 0) {
    try {
      logoImage = await pdfDoc.embedPng(input.logoBytes);
    } catch {
      try {
        logoImage = await pdfDoc.embedJpg(input.logoBytes);
      } catch {
        logoImage = null;
      }
    }
  }
  const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const boxX = PAGE_MARGIN;
  const valueWidth = contentWidth - BOX_PAD * 2 - LABEL_WIDTH;

  const startPage = () => {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    return { page, y: PAGE_HEIGHT - PAGE_MARGIN };
  };

  let { page, y } = startPage();

  const wrap = (text: string, font: PDFFont, size: number, width: number) =>
    wrapPdfText(toPdfText(text), font, size, width);

  const LOGO_MAX_H = 48;
  const LOGO_MAX_W = 150;
  let logoWidth = 0;
  let logoHeight = 0;
  if (logoImage) {
    const scale = Math.min(
      LOGO_MAX_H / logoImage.height,
      LOGO_MAX_W / logoImage.width,
    );
    logoWidth = logoImage.width * scale;
    logoHeight = logoImage.height * scale;
  }

  const colWidth = (contentWidth - BOX_PAD * 2) / 3;
  const codeLines = wrap(input.uniqueCode || "", fontBold, 13, colWidth - 4);
  const nameLines = wrap(input.projectName || "", fontBold, 12, colWidth - 4);
  const companyLines = logoImage
    ? []
    : wrap(input.companyName || "", fontRegular, 11, colWidth - 4);
  const textRowHeight =
    Math.max(codeLines.length, nameLines.length, companyLines.length, 1) * LINE +
    4;
  const headerRowHeight = Math.max(textRowHeight, logoHeight + 6);

  const productLines = (input.products.length > 0 ? input.products : [""]).flatMap(
    (product) => wrap(product, fontRegular, 10, valueWidth),
  );
  const addressLines = wrap(input.siteAddress || "", fontRegular, 10, valueWidth);
  const contactValue = [input.contactName.trim(), input.contactPhone.trim()]
    .filter(Boolean)
    .join("    ");
  const contactLines = wrap(contactValue, fontRegular, 10, valueWidth);
  const productionDate = formatSheetDate(input.productionDate);
  const installationDate = formatSheetDate(input.installationDate);

  const fieldBlockHeight =
    Math.max(productLines.length, 1) * LINE +
    LINE +
    LINE +
    Math.max(addressLines.length, 1) * LINE +
    Math.max(contactLines.length, 1) * LINE +
    28;

  const headerHeight = BOX_PAD + headerRowHeight + 8 + fieldBlockHeight + BOX_PAD;
  drawBox(page, boxX, y, contentWidth, headerHeight);

  let cursor = y - BOX_PAD - 12;
  const innerLeft = boxX + BOX_PAD;
  codeLines.forEach((line, index) => {
    page.drawText(line, {
      x: innerLeft,
      y: cursor - index * LINE,
      size: 13,
      font: fontBold,
      color: INK,
    });
  });
  nameLines.forEach((line, index) => {
    page.drawText(line, {
      x: innerLeft + colWidth,
      y: cursor - index * LINE,
      size: 12,
      font: fontBold,
      color: INK,
    });
  });
  if (logoImage) {
    page.drawImage(logoImage, {
      x: boxX + contentWidth - BOX_PAD - logoWidth,
      y: cursor + 10 - logoHeight,
      width: logoWidth,
      height: logoHeight,
    });
  } else {
    companyLines.forEach((line, index) => {
      page.drawText(line, {
        x: innerLeft + colWidth * 2,
        y: cursor - index * LINE,
        size: 11,
        font: fontRegular,
        color: INK,
      });
    });
  }

  cursor -= headerRowHeight + 6;

  const drawLabeled = (label: string, lines: string[]) => {
    page.drawText(toPdfText(label), {
      x: innerLeft,
      y: cursor,
      size: 10,
      font: fontBold,
      color: INK,
    });
    const rows = lines.length > 0 ? lines : [""];
    rows.forEach((line, index) => {
      if (line) {
        page.drawText(line, {
          x: innerLeft + LABEL_WIDTH,
          y: cursor - index * LINE,
          size: 10,
          font: fontRegular,
          color: INK,
        });
      }
    });
    cursor -= rows.length * LINE + 4;
  };

  drawLabeled("Prodotti:", productLines);
  drawLabeled("Data produzione:", [productionDate]);
  drawLabeled("Data posa:", [installationDate]);
  drawLabeled("Indirizzo cantiere:", addressLines);
  drawLabeled("Persona di contatto:", contactLines);

  y -= headerHeight + GAP;

  const commentBodyWidth = contentWidth - BOX_PAD * 2;
  const productionCommentLines = wrap(
    input.productionComments || "",
    fontRegular,
    10,
    commentBodyWidth,
  );
  const installationCommentLines = wrap(
    input.installationComments || "",
    fontRegular,
    10,
    commentBodyWidth,
  );

  const drawCommentBox = (
    title: string,
    lines: string[],
    preferredHeight: number,
  ) => {
    let height = Math.max(MIN_COMMENT_BOX, preferredHeight);
    if (y - height < PAGE_MARGIN) {
      ({ page, y } = startPage());
    }
    height = Math.min(height, y - PAGE_MARGIN);
    drawBox(page, boxX, y, contentWidth, height);
    page.drawText(toPdfText(title), {
      x: boxX + BOX_PAD,
      y: y - BOX_PAD - 2,
      size: 11,
      font: fontBold,
      color: INK,
    });
    let textY = y - BOX_PAD - 20;
    const minTextY = y - height + BOX_PAD;
    for (const line of lines) {
      if (!line) {
        textY -= LINE;
        continue;
      }
      if (textY < minTextY) break;
      page.drawText(line, {
        x: boxX + BOX_PAD,
        y: textY,
        size: 10,
        font: fontRegular,
        color: INK,
      });
      textY -= LINE;
    }
    y -= height + GAP;
  };

  const neededProduction =
    BOX_PAD + 18 + Math.max(productionCommentLines.length, 1) * LINE + BOX_PAD;
  const neededInstallation =
    BOX_PAD + 18 + Math.max(installationCommentLines.length, 1) * LINE + BOX_PAD;

  let spaceLeft = y - PAGE_MARGIN;
  if (spaceLeft < MIN_COMMENT_BOX * 2 + GAP) {
    ({ page, y } = startPage());
    spaceLeft = y - PAGE_MARGIN;
  }
  const equalHeight = (spaceLeft - GAP) / 2;
  drawCommentBox(
    "Commenti produzione",
    productionCommentLines,
    Math.max(MIN_COMMENT_BOX, neededProduction, equalHeight),
  );
  spaceLeft = y - PAGE_MARGIN;
  if (spaceLeft < MIN_COMMENT_BOX) {
    ({ page, y } = startPage());
    spaceLeft = y - PAGE_MARGIN;
  }
  drawCommentBox(
    "Commenti posa",
    installationCommentLines,
    Math.max(MIN_COMMENT_BOX, neededInstallation, spaceLeft),
  );

  return pdfDoc.save();
}
