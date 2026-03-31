import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
} from "@pdfme/pdf-lib";
import { createServiceClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteContext, hasSiteId } from "@/lib/site-context";
import {
  normalizeOfferProducts,
  sumOfferProductsTotal,
} from "@/lib/offers";

export const dynamic = "force-dynamic";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 40;
const BRAND = rgb(0.09, 0.13, 0.22);
const BRAND_MUTED = rgb(0.35, 0.4, 0.5);
const SOFT_BORDER = rgb(0.85, 0.88, 0.92);
const SOFT_FILL = rgb(0.97, 0.98, 0.99);

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("it-IT");
}

function formatMoney(value?: number | null): string {
  const safeValue = Number(value || 0);
  return `CHF ${safeValue.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function sanitizeFilename(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  if (!text) return [""];

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
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
  return lines;
}

async function getLogoBuffer(logoUrl?: string | null): Promise<Buffer | null> {
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

export async function POST(req: NextRequest) {
  const userContext = await getUserContext();
  if (!userContext?.userId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const siteContext = await getSiteContext(req);
  if (!hasSiteId(siteContext)) {
    return NextResponse.json(
      { error: "Contesto sito non disponibile" },
      { status: 400 },
    );
  }

  const { taskId } = await req.json();
  if (!taskId) {
    return NextResponse.json({ error: "taskId obbligatorio" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: task, error: taskError } = await supabase
    .from("Task")
    .select(`
      *,
      client:Client(*)
    `)
    .eq("id", Number(taskId))
    .eq("site_id", siteContext.siteId)
    .single();

  if (taskError || !task) {
    return NextResponse.json(
      { error: "Offerta non trovata" },
      { status: 404 },
    );
  }

  const client = Array.isArray(task.client) ? task.client[0] : task.client;

  const rawLines = normalizeOfferProducts(task);
  const productIds = rawLines
    .map((line) => line.productId)
    .filter((value): value is number => typeof value === "number");

  let productsById = new Map<number, { name?: string | null; description?: string | null }>();
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from("SellProduct")
      .select("id, name, description")
      .in("id", productIds);

    productsById = new Map(
      (products || []).map((product) => [
        product.id,
        {
          name: product.name,
          description: product.description,
        },
      ]),
    );
  }

  const lines = rawLines.map((line, index) => {
    const product = line.productId ? productsById.get(line.productId) : null;
    const quantity = Number(line.quantity || 0);
    const unitPrice = Number(line.unitPrice || 0);
    return {
      index: index + 1,
      name:
        line.productName ||
        product?.name ||
        `Prodotto ${index + 1}`,
      description: line.description || product?.description || "-",
      quantity,
      unitPrice,
      totalPrice:
        line.totalPrice != null
          ? Number(line.totalPrice)
          : Number((quantity * unitPrice).toFixed(2)),
    };
  });

  const clientName =
    client?.businessName ||
    `${client?.individualLastName || ""} ${client?.individualFirstName || ""}`.trim() ||
    "Cliente";
  const totalValue =
    Number(task.sellPrice || 0) > 0
      ? Number(task.sellPrice)
      : sumOfferProductsTotal(lines);
  const siteName = siteContext.siteData?.name || "Offerta";

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const logoBuffer = await getLogoBuffer(siteContext.siteData?.logo);
  const logoImage = logoBuffer ? await pdfDoc.embedPng(logoBuffer) : null;

  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 92,
    width: PAGE_WIDTH,
    height: 92,
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

  page.drawText(siteName, {
    x: logoImage ? PAGE_MARGIN + 72 : PAGE_MARGIN,
    y: PAGE_HEIGHT - 38,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Offerta commerciale", {
    x: logoImage ? PAGE_MARGIN + 72 : PAGE_MARGIN,
    y: PAGE_HEIGHT - 58,
    size: 10,
    font: fontRegular,
    color: rgb(0.9, 0.93, 0.98),
  });

  const offerCode = task.unique_code || `offerta-${task.id}`;
  const offerCodeWidth = fontBold.widthOfTextAtSize(offerCode, 14);
  page.drawText(offerCode, {
    x: PAGE_WIDTH - PAGE_MARGIN - offerCodeWidth,
    y: PAGE_HEIGHT - 42,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  let y = PAGE_HEIGHT - 122;

  const drawField = (label: string, value: string, x: number, width: number) => {
    page.drawText(label.toUpperCase(), {
      x,
      y,
      size: 8,
      font: fontBold,
      color: BRAND_MUTED,
    });
    const linesForValue = wrapText(value || "-", fontBold, 12, width);
    linesForValue.forEach((line, index) => {
      page.drawText(line, {
        x,
        y: y - 16 - index * 14,
        size: 12,
        font: fontBold,
        color: BRAND,
      });
    });
  };

  drawField("Cliente", clientName, PAGE_MARGIN, 220);
  drawField("Oggetto", task.name || "-", PAGE_MARGIN + 250, 200);
  y -= 54;
  drawField("Luogo", task.luogo || "-", PAGE_MARGIN, 220);
  drawField(
    "Data consegna indicativa",
    formatDate(task.deliveryDate),
    PAGE_MARGIN + 250,
    200,
  );

  y -= 84;

  page.drawText("Dettaglio offerta", {
    x: PAGE_MARGIN,
    y,
    size: 13,
    font: fontBold,
    color: BRAND,
  });
  y -= 24;

  const tableX = PAGE_MARGIN;
  const tableWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const headers = [
    { label: "#", x: tableX, width: 24 },
    { label: "Prodotto", x: tableX + 28, width: 152 },
    { label: "Descrizione", x: tableX + 184, width: 190 },
    { label: "Qta", x: tableX + 378, width: 36 },
    { label: "Prezzo", x: tableX + 418, width: 70 },
    { label: "Totale", x: tableX + 492, width: 63 },
  ];

  page.drawRectangle({
    x: tableX,
    y: y - 18,
    width: tableWidth,
    height: 22,
    color: SOFT_FILL,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
  });
  headers.forEach((header) => {
    page.drawText(header.label, {
      x: header.x + 4,
      y: y - 10,
      size: 9,
      font: fontBold,
      color: BRAND_MUTED,
    });
  });

  y -= 30;

  lines.forEach((line) => {
    const descriptionLines = wrapText(line.description, fontRegular, 9, 180);
    const rowHeight = Math.max(30, descriptionLines.length * 11 + 8);

    page.drawRectangle({
      x: tableX,
      y: y - rowHeight + 8,
      width: tableWidth,
      height: rowHeight,
      borderWidth: 1,
      borderColor: SOFT_BORDER,
      color: rgb(1, 1, 1),
    });

    page.drawText(String(line.index), {
      x: tableX + 4,
      y: y - 12,
      size: 9,
      font: fontRegular,
      color: BRAND,
    });
    page.drawText(line.name, {
      x: tableX + 32,
      y: y - 12,
      size: 10,
      font: fontBold,
      color: BRAND,
    });
    descriptionLines.forEach((descriptionLine, index) => {
      page.drawText(descriptionLine, {
        x: tableX + 188,
        y: y - 12 - index * 11,
        size: 9,
        font: fontRegular,
        color: BRAND,
      });
    });
    page.drawText(String(line.quantity || 0), {
      x: tableX + 382,
      y: y - 12,
      size: 9,
      font: fontRegular,
      color: BRAND,
    });
    page.drawText(formatMoney(line.unitPrice), {
      x: tableX + 422,
      y: y - 12,
      size: 9,
      font: fontRegular,
      color: BRAND,
    });
    page.drawText(formatMoney(line.totalPrice), {
      x: tableX + 496,
      y: y - 12,
      size: 9,
      font: fontBold,
      color: BRAND,
    });

    y -= rowHeight + 6;
  });

  if (task.other) {
    page.drawText("Note", {
      x: PAGE_MARGIN,
      y: y - 6,
      size: 12,
      font: fontBold,
      color: BRAND,
    });
    const noteLines = wrapText(task.other, fontRegular, 10, tableWidth - 16);
    page.drawRectangle({
      x: PAGE_MARGIN,
      y: y - 20 - noteLines.length * 14,
      width: tableWidth,
      height: 20 + noteLines.length * 14,
      borderWidth: 1,
      borderColor: SOFT_BORDER,
      color: SOFT_FILL,
    });
    noteLines.forEach((line, index) => {
      page.drawText(line, {
        x: PAGE_MARGIN + 8,
        y: y - 16 - index * 14,
        size: 10,
        font: fontRegular,
        color: BRAND,
      });
    });
    y -= 34 + noteLines.length * 14;
  }

  page.drawRectangle({
    x: PAGE_WIDTH - PAGE_MARGIN - 180,
    y: y - 36,
    width: 180,
    height: 36,
    color: BRAND,
  });
  page.drawText("Totale offerta", {
    x: PAGE_WIDTH - PAGE_MARGIN - 168,
    y: y - 14,
    size: 9,
    font: fontBold,
    color: rgb(0.9, 0.93, 0.98),
  });
  page.drawText(formatMoney(totalValue), {
    x: PAGE_WIDTH - PAGE_MARGIN - 168,
    y: y - 28,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  const pdfBytes = await pdfDoc.save();
  const filename = sanitizeFilename(offerCode || "offerta");

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
    },
  });
}
