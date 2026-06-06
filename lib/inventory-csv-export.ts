import { getSubcategoryKey, EMPTY_SUBCATEGORY_LABEL } from "@/lib/category-aggregation";
import { formatLocalDate } from "@/lib/utils";

export const INVENTORY_CSV_COLUMNS = [
  { key: "variant_id", header: "ID" },
  { key: "category", header: "CAT" },
  { key: "category_code", header: "COD_CAT" },
  { key: "subcategory", header: "S_CAT" },
  { key: "subcategory_code", header: "COD_S_CAT" },
  { key: "subcategory2", header: "S_CAT_2" },
  { key: "subcategory2_code", header: "COD_S_CAT_2" },
  { key: "color", header: "COLORE" },
  { key: "color_code", header: "COD_COLORE" },
  { key: "internal_code", header: "COD_INT" },
  { key: "warehouse_number", header: "NR_MAG" },
  { key: "supplier", header: "FORNITORE" },
  { key: "supplier_code", header: "COD_FORN" },
  { key: "producer", header: "PRODUTTORE" },
  { key: "producer_code", header: "COD_PROD" },
  { key: "name", header: "NOME" },
  { key: "description", header: "DESCRIZIONE" },
  { key: "url_tds", header: "URL_TDS" },
  { key: "image_url", header: "URL_IMM" },
  { key: "width", header: "LARGHEZZA" },
  { key: "height", header: "ALTEZZA" },
  { key: "thickness", header: "SPESSORE" },
  { key: "diameter", header: "DIAMETRO" },
  { key: "unit", header: "UNITÀ" },
  { key: "quantity", header: "PZ" },
  { key: "unit_price", header: "CHF_ACQUISTO" },
  { key: "sell_price", header: "CHF_VENDITA" },
] as const;

export type InventoryExportRow = Record<
  (typeof INVENTORY_CSV_COLUMNS)[number]["key"],
  string | number | null | undefined
>;

export interface InventoryExportFilter {
  categoryId?: string;
  categoryCode?: string | null;
  categoryName?: string | null;
  subcategoryKey?: string;
}

function normalizeFilterValue(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    return String(value);
  }

  const stringValue = String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function flattenInventoryItemsToRows(items: unknown[]): InventoryExportRow[] {
  const products: InventoryExportRow[] = [];

  for (const rawItem of items) {
    const item = rawItem as {
      name?: string;
      description?: string;
      category?: { id?: string; name?: string; code?: string };
      supplier?: { name?: string };
      variants?: Array<{
        id?: string;
        internal_code?: string;
        warehouse_number?: string;
        supplier_code?: string;
        producer?: string;
        producer_code?: string;
        url_tds?: string;
        image_url?: string;
        stock_quantity?: number;
        purchase_unit_price?: number;
        sell_unit_price?: number;
        unit?: { code?: string };
        attributes?: Record<string, unknown>;
      }>;
    };

    const variants = item.variants || [];
    if (variants.length === 0) {
      products.push({
        variant_id: null,
        name: item.name ?? null,
        description: item.description ?? null,
        category: item.category?.name ?? null,
        category_code: item.category?.code ?? null,
        subcategory: null,
        subcategory_code: null,
        subcategory2: null,
        subcategory2_code: null,
        color: null,
        color_code: null,
        internal_code: null,
        warehouse_number: null,
        supplier: item.supplier?.name ?? null,
        supplier_code: null,
        producer: null,
        producer_code: null,
        url_tds: null,
        image_url: null,
        width: null,
        height: null,
        thickness: null,
        diameter: null,
        unit: null,
        quantity: 0,
        unit_price: null,
        sell_price: null,
      });
      continue;
    }

    for (const variant of variants) {
      const attrs = variant.attributes || {};
      products.push({
        variant_id: variant.id ?? null,
        name: item.name ?? null,
        description: item.description ?? null,
        category:
          (attrs.category as string | undefined) || item.category?.name || null,
        category_code:
          (attrs.category_code as string | undefined) ||
          item.category?.code ||
          null,
        subcategory: (attrs.subcategory as string | undefined) || null,
        subcategory_code: (attrs.subcategory_code as string | undefined) || null,
        subcategory2: (attrs.subcategory2 as string | undefined) || null,
        subcategory2_code:
          (attrs.subcategory2_code as string | undefined) || null,
        color: (attrs.color as string | undefined) || null,
        color_code: (attrs.color_code as string | undefined) || null,
        internal_code: variant.internal_code ?? null,
        warehouse_number: variant.warehouse_number ?? null,
        supplier: item.supplier?.name ?? null,
        supplier_code: variant.supplier_code ?? null,
        producer: variant.producer ?? null,
        producer_code: variant.producer_code ?? null,
        url_tds: variant.url_tds ?? null,
        image_url: variant.image_url ?? null,
        width: (attrs.width as string | number | undefined) ?? null,
        height: (attrs.height as string | number | undefined) ?? null,
        thickness: (attrs.thickness as string | number | undefined) ?? null,
        diameter: (attrs.diameter as string | number | undefined) ?? null,
        unit:
          variant.unit?.code ||
          (attrs.legacy_unit as string | undefined) ||
          null,
        quantity: variant.stock_quantity || 0,
        unit_price: variant.purchase_unit_price ?? null,
        sell_price: variant.sell_unit_price ?? null,
      });
    }
  }

  return products;
}

function getExportRowSubcategoryKey(row: InventoryExportRow): string {
  const raw = String(row.subcategory ?? "").trim();
  const name = raw.length > 0 ? raw : EMPTY_SUBCATEGORY_LABEL;
  return getSubcategoryKey(name);
}

export function filterExportRows(
  rows: InventoryExportRow[],
  filter?: InventoryExportFilter,
): InventoryExportRow[] {
  if (!filter?.categoryId && !filter?.categoryCode && !filter?.categoryName) {
    return rows;
  }

  const categoryId = filter.categoryId;
  const categoryCode = normalizeFilterValue(filter.categoryCode);
  const categoryName = normalizeFilterValue(filter.categoryName);

  let filtered = rows.filter((row) => {
    const rowCategoryCode = normalizeFilterValue(row.category_code);
    const rowCategoryName = normalizeFilterValue(row.category);

    if (categoryId) {
      // API rows don't carry category_id; match by code/name from filter context
      if (categoryCode && rowCategoryCode === categoryCode) return true;
      if (categoryName && rowCategoryName === categoryName) return true;
      return false;
    }

    if (categoryCode && rowCategoryCode === categoryCode) return true;
    if (categoryName && rowCategoryName === categoryName) return true;
    return false;
  });

  if (filter.subcategoryKey) {
    filtered = filtered.filter(
      (row) => getExportRowSubcategoryKey(row) === filter.subcategoryKey,
    );
  }

  return filtered;
}

export function buildCsvContent(rows: InventoryExportRow[]): string {
  const headers = INVENTORY_CSV_COLUMNS.map((col) => col.header);
  const dataRows = rows.map((product) =>
    INVENTORY_CSV_COLUMNS.map((col) => escapeCSVValue(product[col.key])).join(
      ",",
    ),
  );
  return [headers.join(","), ...dataRows].join("\n");
}

function getCategoryGroupKey(row: InventoryExportRow): string {
  return `${row.category_code ?? ""}|${row.category ?? ""}`;
}

function summarizeInventoryRows(rows: InventoryExportRow[]) {
  const pieces = rows.reduce(
    (sum, row) => sum + (Number(row.quantity) || 0),
    0,
  );
  const totalValue = rows.reduce(
    (sum, row) =>
      sum + (Number(row.quantity) || 0) * (Number(row.unit_price) || 0),
    0,
  );

  return {
    itemCount: rows.length,
    pieces,
    totalValue,
  };
}

function buildSummaryLabelRow(label: string): string {
  return escapeCSVValue(label);
}

export function buildHierarchicalInventoryCsvContent(
  rows: InventoryExportRow[],
): string {
  const headers = INVENTORY_CSV_COLUMNS.map((col) => col.header).join(",");
  const lines: string[] = [];

  const byCategory = new Map<string, InventoryExportRow[]>();
  for (const row of rows) {
    const key = getCategoryGroupKey(row);
    const bucket = byCategory.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      byCategory.set(key, [row]);
    }
  }

  const sortedCategoryKeys = Array.from(byCategory.keys()).sort((a, b) => {
    const [, nameA = ""] = a.split("|");
    const [, nameB = ""] = b.split("|");
    return nameA.localeCompare(nameB, "it");
  });

  for (const catKey of sortedCategoryKeys) {
    const catRows = byCategory.get(catKey) ?? [];
    const [catCode = "", catName = ""] = catKey.split("|");
    const catSummary = summarizeInventoryRows(catRows);

    lines.push(
      buildSummaryLabelRow(
        `=== CATEGORIA: ${catName || "Senza categoria"}${catCode ? ` (${catCode})` : ""} ===`,
      ),
    );
    lines.push(
      buildSummaryLabelRow(
        `Articoli: ${catSummary.itemCount} | Pezzi: ${catSummary.pieces} | Valore acquisto: CHF ${catSummary.totalValue.toFixed(2)}`,
      ),
    );
    lines.push("");

    const bySubcategory = new Map<string, InventoryExportRow[]>();
    for (const row of catRows) {
      const subKey = getExportRowSubcategoryKey(row);
      const bucket = bySubcategory.get(subKey);
      if (bucket) {
        bucket.push(row);
      } else {
        bySubcategory.set(subKey, [row]);
      }
    }

    const sortedSubKeys = Array.from(bySubcategory.keys()).sort((a, b) => {
      const nameA =
        bySubcategory.get(a)?.[0]?.subcategory ?? EMPTY_SUBCATEGORY_LABEL;
      const nameB =
        bySubcategory.get(b)?.[0]?.subcategory ?? EMPTY_SUBCATEGORY_LABEL;
      return String(nameA).localeCompare(String(nameB), "it");
    });

    for (const subKey of sortedSubKeys) {
      const subRows = bySubcategory.get(subKey) ?? [];
      const subName = subRows[0]?.subcategory || EMPTY_SUBCATEGORY_LABEL;
      const subCode = subRows[0]?.subcategory_code || "";
      const subSummary = summarizeInventoryRows(subRows);

      lines.push(
        buildSummaryLabelRow(
          `--- Sottocategoria: ${subName}${subCode ? ` (${subCode})` : ""} ---`,
        ),
      );
      lines.push(
        buildSummaryLabelRow(
          `Articoli: ${subSummary.itemCount} | Pezzi: ${subSummary.pieces} | Valore acquisto: CHF ${subSummary.totalValue.toFixed(2)}`,
        ),
      );
      lines.push(headers);
      for (const row of subRows) {
        lines.push(
          INVENTORY_CSV_COLUMNS.map((col) => escapeCSVValue(row[col.key])).join(
            ",",
          ),
        );
      }
      lines.push("");
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export function buildHierarchicalInventoryExportFilename(): string {
  const date = formatLocalDate(new Date());
  return `inventario_riepilogo_${date}.csv`;
}

export function triggerCsvDownload(content: string, filename: string): void {
  const blob = new Blob(["\ufeff" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function fetchInventoryExportItems(domain: string): Promise<unknown[]> {
  const response = await fetch("/api/inventory/items", {
    method: "GET",
    headers: {
      "x-site-domain": domain,
    },
  });

  if (!response.ok) {
    throw new Error("Errore nel recupero dei dati");
  }

  return response.json();
}

export function sanitizeExportFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

export function buildInventoryExportFilename(options?: {
  categoryCode?: string | null;
  categoryName?: string | null;
  subcategoryName?: string | null;
}): string {
  const date = formatLocalDate(new Date());
  const categoryPart = sanitizeExportFilenamePart(
    options?.categoryCode || options?.categoryName || "export",
  );

  if (options?.subcategoryName) {
    const subPart = sanitizeExportFilenamePart(options.subcategoryName);
    return `inventario_${categoryPart}_${subPart}_${date}.csv`;
  }

  return `inventario_${categoryPart}_${date}.csv`;
}

export async function exportInventoryCsv(options: {
  domain: string;
  filter?: InventoryExportFilter;
  filename?: string;
}): Promise<{ rowCount: number; filename: string }> {
  const items = await fetchInventoryExportItems(options.domain);
  const allRows = flattenInventoryItemsToRows(items);
  const filteredRows = filterExportRows(allRows, options.filter);

  if (filteredRows.length === 0) {
    throw new Error("Nessun prodotto da esportare");
  }

  const filename =
    options.filename ??
    buildInventoryExportFilename({
      categoryCode: options.filter?.categoryCode,
      categoryName: options.filter?.categoryName,
      subcategoryName: options.filter?.subcategoryKey
        ? options.filter.subcategoryKey === "__none__"
          ? "Senza_sottocategoria"
          : options.filter.subcategoryKey
        : undefined,
    });

  const csvContent = buildCsvContent(filteredRows);
  triggerCsvDownload(csvContent, filename);

  return { rowCount: filteredRows.length, filename };
}

export async function exportInventoryHierarchicalCsv(options: {
  domain: string;
  filter?: InventoryExportFilter;
  filename?: string;
}): Promise<{ rowCount: number; filename: string }> {
  const items = await fetchInventoryExportItems(options.domain);
  const allRows = flattenInventoryItemsToRows(items);
  const filteredRows = filterExportRows(allRows, options.filter);

  if (filteredRows.length === 0) {
    throw new Error("Nessun prodotto da esportare");
  }

  const filename =
    options.filename ?? buildHierarchicalInventoryExportFilename();
  const csvContent = buildHierarchicalInventoryCsvContent(filteredRows);
  triggerCsvDownload(csvContent, filename);

  return { rowCount: filteredRows.length, filename };
}
