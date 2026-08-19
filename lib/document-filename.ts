/**
 * Naming convention for generated/uploaded documents:
 *   NumeroProgetto_TipoDocumento_NomeCliente_AAAAMMGG.ext
 */

export const DOCUMENT_FILENAME_TYPES = [
  "Offerta",
  "ConfermaOrdine",
  "Fattura",
  "Altro",
  "RiepilogoProgetto",
  "SchedaProgetto",
] as const;

export type DocumentFilenameType = (typeof DOCUMENT_FILENAME_TYPES)[number];

const INVALID_FS_CHARS = /[/\\:*?"<>|]/g;

export function sanitizeDocumentFilenamePart(
  value: string,
  options?: { joinWords?: boolean },
): string {
  const joinWords = options?.joinWords ?? true;
  const stripped = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(INVALID_FS_CHARS, "");
  const spaced = joinWords
    ? stripped.replace(/\s+/g, "")
    : stripped.replace(/\s+/g, "_");
  const cleaned = spaced.replace(/[^A-Za-z0-9_-]/g, "");
  return cleaned || "X";
}

export function formatDocumentDateStamp(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function buildDocumentFilename(input: {
  projectNumber?: string | null;
  documentType: DocumentFilenameType;
  clientName?: string | null;
  generatedAt?: Date;
  extension?: string;
  existingNames?: string[];
}): string {
  const projectNumber = sanitizeDocumentFilenamePart(
    input.projectNumber?.trim() || "Progetto",
    { joinWords: false },
  );
  const clientName = sanitizeDocumentFilenamePart(
    input.clientName?.trim() || "Cliente",
    { joinWords: true },
  );
  const dateStamp = formatDocumentDateStamp(input.generatedAt ?? new Date());
  const extension = (input.extension || "pdf").replace(/^\./, "");
  const existing = new Set(
    (input.existingNames ?? []).map((name) => name.toLowerCase()),
  );

  const stem = `${projectNumber}_${input.documentType}_${clientName}_${dateStamp}`;
  let filename = `${stem}.${extension}`;
  if (!existing.has(filename.toLowerCase())) {
    return filename;
  }

  let suffix = 2;
  while (existing.has(`${stem}_${suffix}.${extension}`.toLowerCase())) {
    suffix += 1;
  }
  return `${stem}_${suffix}.${extension}`;
}
