import type { PDFDocument, PDFPage, PDFImage } from "@pdfme/pdf-lib";

export async function fetchImageBytes(
  url: string,
): Promise<{ bytes: Uint8Array; kind: "png" | "jpg" } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("png")) {
      return { bytes, kind: "png" };
    }
    if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      return { bytes, kind: "jpg" };
    }
    return { bytes, kind: "png" };
  } catch {
    return null;
  }
}

export async function embedCatalogImage(
  pdfDoc: PDFDocument,
  url: string | null | undefined,
): Promise<PDFImage | null> {
  if (!url) return null;
  const fetched = await fetchImageBytes(url);
  if (!fetched) return null;
  try {
    if (fetched.kind === "jpg") {
      return pdfDoc.embedJpg(fetched.bytes);
    }
    return pdfDoc.embedPng(fetched.bytes);
  } catch {
    return null;
  }
}

export function drawRowThumbnail(
  page: PDFPage,
  image: PDFImage,
  x: number,
  y: number,
  size = 36,
): number {
  const scale = Math.min(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  page.drawImage(image, {
    x,
    y: y - height,
    width,
    height,
  });
  return width + 6;
}
