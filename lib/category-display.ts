const piecesFormatter = new Intl.NumberFormat("it-CH", {
  maximumFractionDigits: 2,
});

const valueFormatter = new Intl.NumberFormat("it-CH", {
  style: "currency",
  currency: "CHF",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCategoryPieces(value: number): string {
  return piecesFormatter.format(value);
}

export function formatCategoryValue(value: number): string {
  if (value <= 0) return "—";
  return valueFormatter.format(value);
}

export function formatCategoryCode(code?: string | null): string {
  return code?.trim().toUpperCase() ?? "";
}

export function formatCategoryCountLabel(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatCategoryStatsLine(
  itemCount: number,
  subcategoryCount: number,
): string {
  const articles = formatCategoryCountLabel(itemCount, "articolo", "articoli");
  const subcategories = formatCategoryCountLabel(
    subcategoryCount,
    "sottocategoria",
    "sottocategorie",
  );
  return `${articles} · ${subcategories}`;
}

export function formatSubcategoryStatsLine(itemCount: number): string {
  return formatCategoryCountLabel(itemCount, "articolo", "articoli");
}

export function getCategorySearchText(row: {
  name?: string | null;
  code?: string | null;
  description?: string | null;
}): string {
  return [row.name, row.code, row.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
