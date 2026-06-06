/** Formato pagina A4 in punti PDF (72 dpi) — allineato a pdf-report-branding. */
export const A4_PAGE_WIDTH_PT = 595.28;
export const A4_PAGE_HEIGHT_PT = 841.89;

/** Formato A4 in millimetri (ISO 216). */
export const A4_PAGE_WIDTH_MM = 210;
export const A4_PAGE_HEIGHT_MM = 297;

export const A4_ASPECT_RATIO = A4_PAGE_WIDTH_MM / A4_PAGE_HEIGHT_MM;

export type DocumentPageFormat = "A4";

export const DEFAULT_DOCUMENT_PAGE_FORMAT: DocumentPageFormat = "A4";
