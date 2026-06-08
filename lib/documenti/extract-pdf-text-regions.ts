import { ptToMm } from "@/lib/documenti/image-to-pdf-a4";

export interface PdfTextRegion {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfTextRegionPage {
  pageWidthMm: number;
  pageHeightMm: number;
  regions: PdfTextRegion[];
}

/** Polyfill DOM APIs richieste da pdfjs-dist in Node.js. */
async function ensurePdfJsDomPolyfills(): Promise<void> {
  if (typeof globalThis.DOMMatrix !== "undefined") return;

  const canvas = await import("@napi-rs/canvas");
  globalThis.DOMMatrix = canvas.DOMMatrix as typeof DOMMatrix;
  globalThis.ImageData = canvas.ImageData as unknown as typeof ImageData;
  globalThis.Path2D = canvas.Path2D as typeof Path2D;
}

/** Raggruppa righe di testo vicine verticalmente (stessa riga logica). */
export function mergePdfTextRegions(
  regions: PdfTextRegion[],
  lineThresholdMm = 2.5,
): PdfTextRegion[] {
  if (regions.length === 0) return [];

  const sorted = [...regions].sort((a, b) => a.y - b.y || a.x - b.x);
  const merged: PdfTextRegion[] = [];

  for (const region of sorted) {
    const last = merged[merged.length - 1];
    if (
      last &&
      Math.abs(last.y - region.y) <= lineThresholdMm &&
      region.x <= last.x + last.width + 8
    ) {
      last.text = `${last.text} ${region.text}`.trim();
      const right = Math.max(last.x + last.width, region.x + region.width);
      last.width = Math.round((right - last.x) * 10) / 10;
      last.height = Math.max(last.height, region.height);
      continue;
    }
    merged.push({ ...region });
  }

  return merged;
}

export async function extractPdfTextRegions(
  buffer: Buffer,
): Promise<PdfTextRegionPage> {
  await ensurePdfJsDomPolyfills();

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const pageHeightMm = ptToMm(viewport.height);
    const pageWidthMm = ptToMm(viewport.width);
    const textContent = await page.getTextContent();

    const raw: PdfTextRegion[] = [];
    for (const item of textContent.items) {
      if (!("str" in item) || typeof item.str !== "string") continue;
      const text = item.str.trim();
      if (!text) continue;

      const tx = item.transform;
      const xPt = tx[4] ?? 0;
      const yPt = tx[5] ?? 0;
      const fontHeightPt = item.height ?? Math.abs(tx[3] ?? 10);
      const widthPt =
        item.width && item.width > 0
          ? item.width
          : fontHeightPt * Math.max(text.length * 0.45, 2);

      raw.push({
        text,
        x: ptToMm(xPt),
        y: ptToMm(viewport.height - yPt - fontHeightPt),
        width: ptToMm(widthPt),
        height: ptToMm(fontHeightPt),
      });
    }

    return {
      pageWidthMm,
      pageHeightMm,
      regions: mergePdfTextRegions(raw),
    };
  } finally {
    await pdf.destroy();
  }
}
