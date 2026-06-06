import { getSubcategoryKey, EMPTY_SUBCATEGORY_LABEL } from "@/lib/category-aggregation";
import { formatLocalDate } from "@/lib/utils";

export const SELL_PRODUCT_CSV_COLUMNS = [
  { key: "id", header: "ID" },
  { key: "internal_code", header: "COD_INT" },
  { key: "category.name", header: "CATEGORIA" },
  { key: "subcategory", header: "SOTTOCATEGORIA" },
  { key: "tipo", header: "TIPO" },
  { key: "name", header: "NOME_PRODOTTO" },
  { key: "description", header: "DESCRIZIONE" },
  { key: "price_list", header: "LISTINO_PREZZI" },
  { key: "image_url", header: "URL_IMMAGINE" },
  { key: "doc_url", header: "URL_DOC" },
  { key: "active", header: "ATTIVO" },
] as const;

export interface SellProductExportFilter {
  categoryId?: number;
  categoryName?: string | null;
  subcategoryKey?: string;
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function getCsvValue(product: Record<string, unknown>, key: string): unknown {
  if (key === "subcategory") {
    return product.subcategory || product.type || "";
  }

  if (key === "tipo") {
    return product.tipo || product.product_type || "";
  }

  return getNestedValue(product, key);
}

export function escapeSellCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "SI" : "NO";
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

function getExportRowSubcategoryKey(product: Record<string, unknown>): string {
  const raw = String(product.subcategory || product.type || "").trim();
  const name = raw.length > 0 ? raw : EMPTY_SUBCATEGORY_LABEL;
  return getSubcategoryKey(name);
}

export function filterSellExportRows(
  products: Record<string, unknown>[],
  filter?: SellProductExportFilter,
): Record<string, unknown>[] {
  if (!filter?.categoryId && !filter?.categoryName) {
    return products;
  }

  const categoryName = String(filter.categoryName ?? "")
    .trim()
    .toLowerCase();

  let filtered = products.filter((product) => {
    const productCategoryId =
      (product.category_id as number | undefined) ??
      ((product.category as { id?: number } | undefined)?.id);
    const productCategoryName = String(
      (product.category as { name?: string } | undefined)?.name ?? "",
    )
      .trim()
      .toLowerCase();

    if (filter.categoryId && productCategoryId === filter.categoryId) {
      return true;
    }

    if (categoryName && productCategoryName === categoryName) {
      return true;
    }

    return false;
  });

  if (filter.subcategoryKey) {
    filtered = filtered.filter(
      (product) => getExportRowSubcategoryKey(product) === filter.subcategoryKey,
    );
  }

  return filtered;
}

export function buildSellCsvContent(products: Record<string, unknown>[]): string {
  const headers = SELL_PRODUCT_CSV_COLUMNS.map((col) => col.header);
  const dataRows = products.map((product) =>
    SELL_PRODUCT_CSV_COLUMNS.map((col) =>
      escapeSellCSVValue(getCsvValue(product, col.key)),
    ).join(","),
  );
  return [headers.join(","), ...dataRows].join("\n");
}

function getSellCategoryGroupKey(product: Record<string, unknown>): string {
  const category = product.category as { id?: number; name?: string } | undefined;
  const categoryName = String(category?.name ?? "").trim();
  const categoryId = category?.id ?? product.category_id ?? "";
  return `${categoryId}|${categoryName}`;
}

function getSellSubcategoryLabel(product: Record<string, unknown>): string {
  const raw = String(product.subcategory || product.type || "").trim();
  return raw.length > 0 ? raw : EMPTY_SUBCATEGORY_LABEL;
}

function buildSellSummaryLabelRow(label: string): string {
  return escapeSellCSVValue(label);
}

export function buildHierarchicalSellCsvContent(
  products: Record<string, unknown>[],
): string {
  const headers = SELL_PRODUCT_CSV_COLUMNS.map((col) => col.header).join(",");
  const lines: string[] = [];

  const byCategory = new Map<string, Record<string, unknown>[]>();
  for (const product of products) {
    const key = getSellCategoryGroupKey(product);
    const bucket = byCategory.get(key);
    if (bucket) {
      bucket.push(product);
    } else {
      byCategory.set(key, [product]);
    }
  }

  const sortedCategoryKeys = Array.from(byCategory.keys()).sort((a, b) => {
    const [, nameA = ""] = a.split("|");
    const [, nameB = ""] = b.split("|");
    return nameA.localeCompare(nameB, "it");
  });

  for (const catKey of sortedCategoryKeys) {
    const catRows = byCategory.get(catKey) ?? [];
    const [, catName = ""] = catKey.split("|");
    lines.push(
      buildSellSummaryLabelRow(
        `=== CATEGORIA: ${catName || "Senza categoria"} ===`,
      ),
    );
    lines.push(
      buildSellSummaryLabelRow(`Prodotti: ${catRows.length}`),
    );
    lines.push("");

    const bySubcategory = new Map<string, Record<string, unknown>[]>();
    for (const product of catRows) {
      const subKey = getExportRowSubcategoryKey(product);
      const bucket = bySubcategory.get(subKey);
      if (bucket) {
        bucket.push(product);
      } else {
        bySubcategory.set(subKey, [product]);
      }
    }

    const sortedSubKeys = Array.from(bySubcategory.keys()).sort((a, b) => {
      const nameA = bySubcategory.get(a)?.[0]
        ? getSellSubcategoryLabel(bySubcategory.get(a)![0])
        : EMPTY_SUBCATEGORY_LABEL;
      const nameB = bySubcategory.get(b)?.[0]
        ? getSellSubcategoryLabel(bySubcategory.get(b)![0])
        : EMPTY_SUBCATEGORY_LABEL;
      return String(nameA).localeCompare(String(nameB), "it");
    });

    for (const subKey of sortedSubKeys) {
      const subRows = bySubcategory.get(subKey) ?? [];
      const subName = getSellSubcategoryLabel(subRows[0] ?? {});
      lines.push(
        buildSellSummaryLabelRow(`--- Sottocategoria: ${subName} ---`),
      );
      lines.push(buildSellSummaryLabelRow(`Prodotti: ${subRows.length}`));
      lines.push(headers);
      for (const product of subRows) {
        lines.push(
          SELL_PRODUCT_CSV_COLUMNS.map((col) =>
            escapeSellCSVValue(getCsvValue(product, col.key)),
          ).join(","),
        );
      }
      lines.push("");
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export function buildHierarchicalSellExportFilename(): string {
  const date = formatLocalDate(new Date());
  return `prodotti_riepilogo_${date}.csv`;
}

export function triggerSellCsvDownload(content: string, filename: string): void {
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

export async function fetchSellProductExportItems(
  siteId: string,
): Promise<Record<string, unknown>[]> {
  const response = await fetch("/api/sell-products", {
    method: "GET",
    headers: {
      "x-site-id": siteId,
    },
  });

  if (!response.ok) {
    throw new Error("Errore nel recupero dei dati");
  }

  return response.json();
}

export function sanitizeSellExportFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

export function buildSellProductExportFilename(options?: {
  categoryName?: string | null;
  subcategoryName?: string | null;
}): string {
  const date = formatLocalDate(new Date());
  const categoryPart = sanitizeSellExportFilenamePart(
    options?.categoryName || "export",
  );

  if (options?.subcategoryName) {
    const subPart = sanitizeSellExportFilenamePart(options.subcategoryName);
    return `prodotti_${categoryPart}_${subPart}_${date}.csv`;
  }

  return `prodotti_${categoryPart}_${date}.csv`;
}

export async function exportSellProductsCsv(options: {
  siteId: string;
  filter?: SellProductExportFilter;
  filename?: string;
}): Promise<{ rowCount: number; filename: string }> {
  const products = await fetchSellProductExportItems(options.siteId);
  const filteredRows = filterSellExportRows(products, options.filter);

  if (filteredRows.length === 0) {
    throw new Error("Nessun prodotto da esportare");
  }

  const filename =
    options.filename ??
    buildSellProductExportFilename({
      categoryName: options.filter?.categoryName,
      subcategoryName: options.filter?.subcategoryKey,
    });

  const csvContent = buildSellCsvContent(filteredRows);
  triggerSellCsvDownload(csvContent, filename);

  return { rowCount: filteredRows.length, filename };
}

export async function exportSellProductsHierarchicalCsv(options: {
  siteId: string;
  filter?: SellProductExportFilter;
  filename?: string;
}): Promise<{ rowCount: number; filename: string }> {
  const products = await fetchSellProductExportItems(options.siteId);
  const filteredRows = filterSellExportRows(products, options.filter);

  if (filteredRows.length === 0) {
    throw new Error("Nessun prodotto da esportare");
  }

  const filename = options.filename ?? buildHierarchicalSellExportFilename();
  const csvContent = buildHierarchicalSellCsvContent(filteredRows);
  triggerSellCsvDownload(csvContent, filename);

  return { rowCount: filteredRows.length, filename };
}
