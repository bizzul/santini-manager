export const SELL_PRODUCT_IMPORT_HEADERS = [
  "ID",
  "COD_INT",
  "CATEGORIA",
  "SOTTOCATEGORIA",
  "TIPO",
  "NOME_PRODOTTO",
  "DESCRIZIONE",
  "LISTINO_PREZZI",
  "URL_IMMAGINE",
  "URL_DOC",
  "ATTIVO",
] as const;

const BOOLEAN_TRUE_VALUES = new Set(["SI", "SÌ", "YES", "1", "TRUE", "VERO"]);

export type SellProductImportAction = "insert" | "update" | "skip" | "error";

export interface SellProductCategoryRecord {
  id: number;
  name: string;
}

export interface SellProductImportExistingRecord {
  id: number;
  internal_code?: string | null;
  name?: string | null;
  type?: string | null;
  subcategory?: string | null;
  tipo?: string | null;
  product_type?: string | null;
  description?: string | null;
  price_list?: boolean | null;
  image_url?: string | null;
  doc_url?: string | null;
  active?: boolean | null;
  category?:
    | { id?: number | null; name?: string | null }
    | Array<{ id?: number | null; name?: string | null }>
    | null;
}

export interface ParsedSellProductCsvRow {
  rowNumber: number;
  id: number | null;
  internal_code: string | null;
  category_name: string | null;
  subcategory: string | null;
  tipo: string | null;
  name: string | null;
  description: string | null;
  price_list: boolean;
  image_url: string | null;
  doc_url: string | null;
  active: boolean;
}

export interface SellProductImportFieldChange {
  field: string;
  from: string;
  to: string;
}

export interface SellProductImportPlanEntry {
  rowNumber: number;
  action: SellProductImportAction;
  reason?: string;
  categoryName: string | null;
  code: string | null;
  name: string | null;
  targetId?: number;
  fingerprint?: string;
  changes: SellProductImportFieldChange[];
  duplicateIdsToDeactivate: number[];
  csvRow: ParsedSellProductCsvRow;
}

export interface SellProductImportReportEntry {
  rowNumber: number;
  action: SellProductImportAction;
  reason?: string;
  categoryName: string | null;
  code: string | null;
  name: string | null;
  targetId?: number;
  changes: SellProductImportFieldChange[];
  duplicateIdsToDeactivate: number[];
}

export interface SellProductImportSummary {
  totalRows: number;
  filteredOut: number;
  plannedInserts: number;
  plannedUpdates: number;
  plannedDeactivations: number;
  skipped: number;
  errors: string[];
}

export interface SellProductImportPlan {
  headers: string[];
  rows: ParsedSellProductCsvRow[];
  entries: SellProductImportPlanEntry[];
  summary: SellProductImportSummary;
}

function normalizeValue(value?: string | null) {
  return (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeSellProductCategory(value?: string | null) {
  return normalizeValue(value);
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "SI" : "NO";
  }

  return String(value);
}

function parseBoolean(value: string | null) {
  if (!value) {
    return true;
  }

  return BOOLEAN_TRUE_VALUES.has(value.trim().toUpperCase());
}

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

export function parseSellProductCsv(csvText: string) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return { headers: [], rows: [] as string[][] };
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => parseCsvLine(line));
  return { headers, rows };
}

export function mapSellProductCsvRow(
  headers: string[],
  row: string[],
  rowNumber: number,
): ParsedSellProductCsvRow {
  const getValue = (header: string) => {
    const index = headers.indexOf(header);
    if (index === -1) {
      return null;
    }

    const value = row[index]?.trim() ?? "";
    return value === "" ? null : value;
  };

  const rawId = getValue("ID");
  const parsedId = rawId ? Number(rawId) : null;

  return {
    rowNumber,
    id: parsedId && Number.isInteger(parsedId) ? parsedId : null,
    internal_code: getValue("COD_INT"),
    category_name: getValue("CATEGORIA"),
    subcategory: getValue("SOTTOCATEGORIA"),
    tipo: getValue("TIPO"),
    name: getValue("NOME_PRODOTTO"),
    description: getValue("DESCRIZIONE"),
    price_list: parseBoolean(getValue("LISTINO_PREZZI")),
    image_url: getValue("URL_IMMAGINE"),
    doc_url: getValue("URL_DOC"),
    active: parseBoolean(getValue("ATTIVO")),
  };
}

export function getSellProductFingerprint(input: {
  categoryName?: string | null;
  subcategory?: string | null;
  name?: string | null;
}) {
  return [
    normalizeSellProductCategory(input.categoryName),
    normalizeValue(input.subcategory),
    normalizeValue(input.name),
  ].join("::");
}

function getCategoryRecordName(
  category:
    | { id?: number | null; name?: string | null }
    | Array<{ id?: number | null; name?: string | null }>
    | null
    | undefined,
) {
  const normalizedCategory = Array.isArray(category) ? category[0] : category;
  return normalizedCategory?.name || null;
}

function getDiffs(
  existing: SellProductImportExistingRecord,
  csvRow: ParsedSellProductCsvRow,
  headers: string[],
) {
  const diffs: SellProductImportFieldChange[] = [];
  const hasTipoColumn = headers.includes("TIPO");
  const comparisons: Array<{
    field: string;
    current: unknown;
    next: unknown;
  }> = [
    { field: "COD_INT", current: existing.internal_code, next: csvRow.internal_code },
    {
      field: "CATEGORIA",
      current: getCategoryRecordName(existing.category),
      next: csvRow.category_name,
    },
    {
      field: "SOTTOCATEGORIA",
      current: existing.subcategory || existing.type,
      next: csvRow.subcategory,
    },
    { field: "NOME_PRODOTTO", current: existing.name, next: csvRow.name },
    { field: "DESCRIZIONE", current: existing.description, next: csvRow.description },
    { field: "LISTINO_PREZZI", current: existing.price_list ?? false, next: csvRow.price_list },
    { field: "URL_IMMAGINE", current: existing.image_url, next: csvRow.image_url },
    { field: "URL_DOC", current: existing.doc_url, next: csvRow.doc_url },
    { field: "ATTIVO", current: existing.active ?? true, next: csvRow.active },
  ];

  if (hasTipoColumn) {
    comparisons.splice(4, 0, {
      field: "TIPO",
      current: existing.tipo || existing.product_type,
      next: csvRow.tipo,
    });
  }

  comparisons.forEach(({ field, current, next }) => {
    if (stringifyValue(current) !== stringifyValue(next)) {
      diffs.push({
        field,
        from: stringifyValue(current),
        to: stringifyValue(next),
      });
    }
  });

  return diffs;
}

function dedupeNumbers(values: number[]) {
  return Array.from(new Set(values));
}

export function buildSellProductImportPlan(params: {
  headers: string[];
  rows: string[][];
  existingProducts: SellProductImportExistingRecord[];
  categoryFilter?: string | null;
}) {
  const parsedRows = params.rows.map((row, index) =>
    mapSellProductCsvRow(params.headers, row, index + 2),
  );

  const existingById = new Map<number, SellProductImportExistingRecord>();
  const existingByInternalCode = new Map<string, SellProductImportExistingRecord[]>();

  params.existingProducts.forEach((product) => {
    existingById.set(product.id, product);
    const internalCode = product.internal_code?.trim();
    if (internalCode) {
      const current = existingByInternalCode.get(internalCode) || [];
      current.push(product);
      existingByInternalCode.set(internalCode, current);
    }
  });

  const errors: string[] = [];
  const entries: SellProductImportPlanEntry[] = [];
  const seenCsvIds = new Set<number>();
  const seenFingerprints = new Set<string>();
  const normalizedFilter = normalizeSellProductCategory(params.categoryFilter);
  let filteredOut = 0;
  let plannedInserts = 0;
  let plannedUpdates = 0;
  let plannedDeactivations = 0;
  let skipped = 0;

  parsedRows.forEach((csvRow) => {
    if (!csvRow.category_name) {
      errors.push(`Riga ${csvRow.rowNumber}: categoria mancante`);
      entries.push({
        rowNumber: csvRow.rowNumber,
        action: "error",
        reason: "Categoria mancante",
        categoryName: csvRow.category_name,
        code: csvRow.internal_code,
        name: csvRow.name,
        changes: [],
        duplicateIdsToDeactivate: [],
        csvRow,
      });
      return;
    }

    if (
      normalizedFilter &&
      normalizeSellProductCategory(csvRow.category_name) !== normalizedFilter
    ) {
      filteredOut += 1;
      entries.push({
        rowNumber: csvRow.rowNumber,
        action: "skip",
        reason: `Fuori filtro categoria (${params.categoryFilter})`,
        categoryName: csvRow.category_name,
        code: csvRow.internal_code,
        name: csvRow.name,
        changes: [],
        duplicateIdsToDeactivate: [],
        csvRow,
      });
      return;
    }

    if (!csvRow.name) {
      errors.push(`Riga ${csvRow.rowNumber}: nome prodotto mancante`);
      entries.push({
        rowNumber: csvRow.rowNumber,
        action: "error",
        reason: "Nome prodotto mancante",
        categoryName: csvRow.category_name,
        code: csvRow.internal_code,
        name: csvRow.name,
        changes: [],
        duplicateIdsToDeactivate: [],
        csvRow,
      });
      return;
    }

    if (!csvRow.subcategory) {
      errors.push(`Riga ${csvRow.rowNumber}: sottocategoria mancante`);
      entries.push({
        rowNumber: csvRow.rowNumber,
        action: "error",
        reason: "Sottocategoria mancante",
        categoryName: csvRow.category_name,
        code: csvRow.internal_code,
        name: csvRow.name,
        changes: [],
        duplicateIdsToDeactivate: [],
        csvRow,
      });
      return;
    }

    if (csvRow.id && seenCsvIds.has(csvRow.id)) {
      skipped += 1;
      entries.push({
        rowNumber: csvRow.rowNumber,
        action: "skip",
        reason: `ID duplicato nel CSV (${csvRow.id})`,
        categoryName: csvRow.category_name,
        code: csvRow.internal_code,
        name: csvRow.name,
        changes: [],
        duplicateIdsToDeactivate: [],
        csvRow,
      });
      return;
    }

    const fingerprint = getSellProductFingerprint({
      categoryName: csvRow.category_name,
      subcategory: csvRow.subcategory,
      name: csvRow.name,
    });

    if (seenFingerprints.has(fingerprint)) {
      skipped += 1;
      entries.push({
        rowNumber: csvRow.rowNumber,
        action: "skip",
        reason: "Prodotto duplicato nel CSV per categoria/sottocategoria/nome",
        categoryName: csvRow.category_name,
        code: csvRow.internal_code,
        name: csvRow.name,
        fingerprint,
        changes: [],
        duplicateIdsToDeactivate: [],
        csvRow,
      });
      return;
    }

    if (csvRow.id) {
      seenCsvIds.add(csvRow.id);
    }
    seenFingerprints.add(fingerprint);

    const target = csvRow.id ? existingById.get(csvRow.id) : undefined;
    const codeConflicts = dedupeNumbers(
      (existingByInternalCode.get(csvRow.internal_code || "") || [])
        .map((product) => product.id),
    );

    if (target) {
      const changes = getDiffs(target, csvRow, params.headers);
      const isMeaningfulUpdate = changes.length > 0;

      if (!isMeaningfulUpdate) {
        skipped += 1;
        entries.push({
          rowNumber: csvRow.rowNumber,
          action: "skip",
          reason: "Nessuna differenza rispetto al record esistente",
          categoryName: csvRow.category_name,
          code: csvRow.internal_code,
          name: csvRow.name,
          targetId: target.id,
          fingerprint,
          changes,
          duplicateIdsToDeactivate: [],
          csvRow,
        });
        return;
      }

      plannedInserts += 1;
      entries.push({
        rowNumber: csvRow.rowNumber,
        action: "insert",
        reason:
          codeConflicts.length > 0
            ? `Nuova versione del prodotto: il record storico ID ${target.id} resta invariato e il nuovo record ricevera un COD_INT automatico`
            : `Nuova versione del prodotto: il record storico ID ${target.id} resta invariato`,
        categoryName: csvRow.category_name,
        code: csvRow.internal_code,
        name: csvRow.name,
        targetId: target.id,
        fingerprint,
        changes,
        duplicateIdsToDeactivate: [],
        csvRow,
      });
      return;
    }

    plannedInserts += 1;
    entries.push({
      rowNumber: csvRow.rowNumber,
      action: "insert",
      reason:
        codeConflicts.length > 0
          ? `COD_INT gia usato dal prodotto ${codeConflicts[0]}: al nuovo record verra assegnato un COD_INT automatico`
          : undefined,
      categoryName: csvRow.category_name,
      code: csvRow.internal_code,
      name: csvRow.name,
      fingerprint,
      changes: [],
      duplicateIdsToDeactivate: [],
      csvRow,
    });
  });

  return {
    headers: params.headers,
    rows: parsedRows,
    entries,
    summary: {
      totalRows: parsedRows.length,
      filteredOut,
      plannedInserts,
      plannedUpdates,
      plannedDeactivations,
      skipped,
      errors,
    },
  } satisfies SellProductImportPlan;
}

export function buildSellProductImportReportCsv(
  entries: SellProductImportReportEntry[],
) {
  const headers = [
    "RIGA",
    "AZIONE",
    "ID_TARGET",
    "CODICE",
    "CATEGORIA",
    "NOME",
    "MOTIVO",
    "CAMBI",
    "ID_DISATTIVATI",
  ];

  const escape = (value: unknown) => {
    const stringValue = stringifyValue(value);
    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  };

  const rows = entries.map((entry) => [
    entry.rowNumber,
    entry.action,
    entry.targetId ?? "",
    entry.code ?? "",
    entry.categoryName ?? "",
    entry.name ?? "",
    entry.reason ?? "",
    entry.changes.map((change) => `${change.field}: ${change.from} -> ${change.to}`).join(" | "),
    entry.duplicateIdsToDeactivate.join("|"),
  ]);

  return [headers, ...rows]
    .map((row) => row.map((value) => escape(value)).join(","))
    .join("\n");
}
