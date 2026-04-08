import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFImage,
  type PDFPage,
} from "@pdfme/pdf-lib";
import { getSiteContext, hasSiteId } from "@/lib/site-context";
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
  getPdfLogoBuffer,
  sanitizeReportFilename,
  wrapPdfText,
} from "@/lib/pdf-report-branding";
import { createTabularReportResponse } from "@/lib/tabular-report-export";
import { createServiceClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type ProductExportRow = {
  Nome: string;
  Categoria: string;
  Tipologia: string;
  Descrizione: string;
  "Listino prezzi": string;
  "Url immagine": string;
  "Url documento": string;
  Attivo: string;
};

type ReportFormat = "excel" | "pdf";

type ProductRecord = {
  id?: number | null;
  name?: string | null;
  type?: string | null;
  description?: string | null;
  price_list?: string | boolean | number | null;
  image_url?: string | null;
  doc_url?: string | null;
  active?: boolean | null;
  category_id?: number | string | null;
  category?:
    | {
        name?: string | null;
      }
    | Array<{
        name?: string | null;
      }>
    | null;
};

function getCategoryName(product: ProductRecord) {
  const category = Array.isArray(product.category)
    ? product.category[0]
    : product.category;
  return category?.name || "-";
}

function normalizeText(value?: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? normalized : "-";
  }

  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "-";
  }

  if (Array.isArray(value)) {
    const normalizedItems: string[] = value
      .map((item) => normalizeText(item))
      .filter((item) => item !== "-");
    return normalizedItems.length > 0 ? normalizedItems.join(", ") : "-";
  }

  return String(value);
}

async function getProductPdfImage(
  pdfDoc: PDFDocument,
  imageUrl: string | null | undefined,
  cache: Map<string, Promise<PDFImage | null>>,
) {
  if (!imageUrl) {
    return null;
  }

  const normalizedUrl = imageUrl.trim();
  if (!normalizedUrl) {
    return null;
  }

  if (!cache.has(normalizedUrl)) {
    cache.set(
      normalizedUrl,
      (async () => {
        try {
          const response = await fetch(normalizedUrl);
          if (!response.ok) {
            return null;
          }

          const arrayBuffer = await response.arrayBuffer();
          const pngBuffer = await sharp(Buffer.from(arrayBuffer))
            .resize({
              width: 320,
              height: 320,
              fit: "inside",
              withoutEnlargement: true,
            })
            .png()
            .toBuffer();

          return pdfDoc.embedPng(pngBuffer);
        } catch {
          return null;
        }
      })(),
    );
  }

  return cache.get(normalizedUrl)!;
}

async function buildProductsPdfResponse(options: {
  products: ProductRecord[];
  categoryIds: number[];
  subcategories: string[];
  siteName?: string | null;
  logoUrl?: string | null;
}) {
  const { products, categoryIds, subcategories, siteName, logoUrl } = options;
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logoBuffer = await getPdfLogoBuffer(logoUrl);
  const logoImage = logoBuffer ? await pdfDoc.embedPng(logoBuffer) : null;
  const pages: PDFPage[] = [];
  const imageCache = new Map<string, Promise<PDFImage | null>>();
  const cardWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const cardPadding = 14;
  const cardGap = 12;
  const imageBoxSize = 88;
  const imageInnerPadding = 6;
  const textX = PAGE_MARGIN + cardPadding + imageBoxSize + 16;
  const textWidth = PAGE_MARGIN + cardWidth - cardPadding - textX;
  const lineHeight = 10;
  const groupGap = 4;
  const metaLines = [
    `Categorie selezionate: ${categoryIds.length > 0 ? categoryIds.length : "tutte"}`,
    `Sottocategorie selezionate: ${subcategories.length > 0 ? subcategories.length : "tutte"}`,
    `Prodotti esportati: ${products.length}`,
  ];

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - TOP_HEADER_HEIGHT - 18;

  const drawHeader = (currentPage: PDFPage, isFirstPage: boolean) => {
    drawPdfReportHeader({
      page: currentPage,
      fontRegular,
      fontBold,
      siteName: siteName || "Santini Manager",
      title: "Report prodotti",
      subtitle: isFirstPage
        ? "Anagrafica completa dei prodotti del sito"
        : "Anagrafica completa dei prodotti del sito - continua",
      documentCode: "PRODOTTI",
      logoImage,
    });
  };

  const ensureSpace = (height: number) => {
    if (y - height >= BOTTOM_MARGIN) {
      return;
    }

    pages.push(page);
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawHeader(page, false);
    y = PAGE_HEIGHT - TOP_HEADER_HEIGHT - 18;
  };

  drawHeader(page, true);
  metaLines.forEach((line) => {
    page.drawText(line, {
      x: PAGE_MARGIN,
      y,
      size: 9,
      font: fontRegular,
      color: BRAND_MUTED,
    });
    y -= 14;
  });
  y -= 8;

  if (products.length === 0) {
    page.drawText("Nessun prodotto trovato per i filtri selezionati.", {
      x: PAGE_MARGIN,
      y,
      size: 11,
      font: fontBold,
      color: BRAND,
    });
  }

  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    const detailGroups = [
      wrapPdfText(
        `Categoria: ${getCategoryName(product)}`,
        fontRegular,
        8.5,
        textWidth,
      ),
      wrapPdfText(
        `Sottocategoria: ${normalizeText(product.type)}`,
        fontRegular,
        8.5,
        textWidth,
      ),
      wrapPdfText(
        `Listino prezzi: ${normalizeText(product.price_list)}`,
        fontRegular,
        8.5,
        textWidth,
      ),
      wrapPdfText(
        `Stato: ${product.active ? "Prodotto attivo" : "Prodotto non attivo"}`,
        fontRegular,
        8.5,
        textWidth,
      ),
      wrapPdfText(
        `Scheda tecnica: ${normalizeText(product.doc_url)}`,
        fontRegular,
        8.5,
        textWidth,
      ),
      wrapPdfText(
        `Descrizione: ${normalizeText(product.description)}`,
        fontRegular,
        8.5,
        textWidth,
      ),
    ];
    const detailLineCount = detailGroups.reduce(
      (total, lines) => total + lines.length,
      0,
    );
    const groupGapCount = Math.max(detailGroups.length - 1, 0);
    const textBlockHeight = 18 + detailLineCount * lineHeight + groupGapCount * groupGap;
    const cardHeight = Math.max(
      120,
      cardPadding * 2 + Math.max(imageBoxSize, textBlockHeight),
    );

    ensureSpace(cardHeight);

    const cardTop = y;
    const cardBottom = y - cardHeight;
    const imageBoxX = PAGE_MARGIN + cardPadding;
    const imageBoxY = cardTop - cardPadding - imageBoxSize;

    page.drawRectangle({
      x: PAGE_MARGIN,
      y: cardBottom,
      width: cardWidth,
      height: cardHeight,
      color: index % 2 === 0 ? rgb(0.985, 0.988, 0.992) : rgb(1, 1, 1),
      borderColor: SOFT_BORDER,
      borderWidth: 1,
    });

    page.drawRectangle({
      x: imageBoxX,
      y: imageBoxY,
      width: imageBoxSize,
      height: imageBoxSize,
      color: SOFT_FILL,
      borderColor: SOFT_BORDER,
      borderWidth: 1,
    });

    const productImage = await getProductPdfImage(
      pdfDoc,
      product.image_url,
      imageCache,
    );

    if (productImage) {
      const availableWidth = imageBoxSize - imageInnerPadding * 2;
      const availableHeight = imageBoxSize - imageInnerPadding * 2;
      const scale = Math.min(
        availableWidth / productImage.width,
        availableHeight / productImage.height,
      );
      const drawWidth = productImage.width * scale;
      const drawHeight = productImage.height * scale;

      page.drawImage(productImage, {
        x: imageBoxX + (imageBoxSize - drawWidth) / 2,
        y: imageBoxY + (imageBoxSize - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight,
      });
    } else {
      const placeholder = ["Nessuna", "immagine"];
      placeholder.forEach((line, lineIndex) => {
        const textWidthValue = fontRegular.widthOfTextAtSize(line, 8);
        page.drawText(line, {
          x: imageBoxX + (imageBoxSize - textWidthValue) / 2,
          y: imageBoxY + imageBoxSize / 2 - lineIndex * 10,
          size: 8,
          font: fontRegular,
          color: BRAND_MUTED,
        });
      });
    }

    page.drawText(normalizeText(product.name), {
      x: textX,
      y: cardTop - cardPadding - 2,
      size: 12,
      font: fontBold,
      color: BRAND,
    });

    let currentTextY = cardTop - cardPadding - 18;
    detailGroups.forEach((lines, groupIndex) => {
      lines.forEach((line) => {
        page.drawText(line, {
          x: textX,
          y: currentTextY,
          size: 8.5,
          font: fontRegular,
          color: BRAND_MUTED,
        });
        currentTextY -= lineHeight;
      });

      if (groupIndex < detailGroups.length - 1) {
        currentTextY -= groupGap;
      }
    });

    y -= cardHeight + cardGap;
  }

  pages.push(page);
  pages.forEach((currentPage, index) => {
    drawPdfFooter({
      page: currentPage,
      pageNumber: index + 1,
      totalPages: pages.length,
      fontRegular,
    });
  });

  const filename =
    sanitizeReportFilename("report-prodotti") || "report-prodotti";
  const pdfBytes = await pdfDoc.save();

  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

async function buildProductsReport(
  req: NextRequest,
  categoryIds: number[],
  subcategories: string[],
  format: ReportFormat,
) {
  const siteContext = await getSiteContext(req);
  if (!hasSiteId(siteContext)) {
    return NextResponse.json(
      { error: "Contesto sito non disponibile" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  let query = supabase
    .from("SellProduct")
    .select(`
      *,
      category:category_id(id, name)
    `)
    .eq("site_id", siteContext.siteId)
    .order("name", { ascending: true });

  if (categoryIds.length > 0) {
    query = query.in("category_id", categoryIds);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filteredProducts = ((data || []) as ProductRecord[]).filter((product) => {
    if (categoryIds.length > 0 && !categoryIds.includes(Number(product.category_id))) {
      return false;
    }

    if (subcategories.length > 0 && !subcategories.includes(product.type || "")) {
      return false;
    }

    return true;
  });

  const rows: ProductExportRow[] = filteredProducts.map((product) => ({
    Nome: product.name || "-",
    Categoria: getCategoryName(product),
    Tipologia: product.type || "-",
    Descrizione: product.description || "-",
    "Listino prezzi": normalizeText(product.price_list),
    "Url immagine": product.image_url || "-",
    "Url documento": product.doc_url || "-",
    Attivo: product.active ? "Si" : "No",
  }));

  if (format === "pdf") {
    return buildProductsPdfResponse({
      products: filteredProducts,
      categoryIds,
      subcategories,
      siteName: siteContext.siteData?.name,
      logoUrl: siteContext.siteData?.logo,
    });
  }

  return createTabularReportResponse({
    title: "Report prodotti",
    subtitle: "Anagrafica completa dei prodotti del sito",
    sheetName: "Prodotti",
    filenameBase: "report-prodotti",
    format,
    rows,
    columns: [
      { key: "Nome", header: "Nome", width: 24 },
      { key: "Categoria", header: "Categoria", width: 20 },
      { key: "Tipologia", header: "Tipologia", width: 18 },
      { key: "Descrizione", header: "Descrizione", width: 36 },
      { key: "Listino prezzi", header: "Listino prezzi", width: 20 },
      { key: "Url immagine", header: "Url immagine", width: 32 },
      { key: "Url documento", header: "Url documento", width: 32 },
      { key: "Attivo", header: "Attivo", width: 10 },
    ],
    metaLines: [
      `Categorie selezionate: ${categoryIds.length > 0 ? categoryIds.length : "tutte"}`,
      `Sottocategorie selezionate: ${subcategories.length > 0 ? subcategories.length : "tutte"}`,
      `Prodotti esportati: ${rows.length}`,
    ],
    siteName: siteContext.siteData?.name,
    logoUrl: siteContext.siteData?.logo,
    documentCode: "PRODOTTI",
  });
}

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "excel";
  return buildProductsReport(req, [], [], format);
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  const format = payload?.format === "pdf" ? "pdf" : "excel";
  const categoryIds = Array.isArray(payload?.categoryIds)
    ? payload.categoryIds
        .map((categoryId: unknown) => Number(categoryId))
        .filter((categoryId: number) => Number.isInteger(categoryId))
    : [];
  const subcategories = Array.isArray(payload?.subcategories)
    ? payload.subcategories
        .map((subcategory: unknown) => String(subcategory).trim())
        .filter((subcategory: string) => subcategory.length > 0)
    : [];

  return buildProductsReport(req, categoryIds, subcategories, format);
}
