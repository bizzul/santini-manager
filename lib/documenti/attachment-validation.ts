export const DOCUMENT_ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const DOCUMENT_ATTACHMENT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export function validateDocumentAttachment(file: {
  name: string;
  size: number;
  type?: string;
}): { valid: boolean; message?: string } {
  if (file.size > DOCUMENT_ATTACHMENT_MAX_SIZE_BYTES) {
    return {
      valid: false,
      message: `File troppo grande. Massimo ${DOCUMENT_ATTACHMENT_MAX_SIZE_BYTES / 1024 / 1024} MB.`,
    };
  }

  if (
    file.type &&
    !DOCUMENT_ATTACHMENT_ALLOWED_MIME_TYPES.includes(file.type)
  ) {
    return {
      valid: false,
      message:
        "Formato non supportato. Usa PDF, Word, Excel, testo o immagini (JPEG/PNG/WebP).",
    };
  }

  return { valid: true };
}
