const SELL_PRODUCT_PREFIXES: Record<string, string> = {
  accessori: "ACC",
  arredamento: "ARR",
  porte: "POR",
  porta: "POR",
  posa: "POS",
  serramenti: "SER",
  serramento: "SER",
  service: "SRV",
  vario: "VAR",
};

function normalizeCategoryName(value?: string | null) {
  return (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getSellProductCodePrefix(categoryName?: string | null) {
  return SELL_PRODUCT_PREFIXES[normalizeCategoryName(categoryName)] || "PRD";
}

export function formatSellProductCode(
  categoryName: string | null | undefined,
  id: number | string,
) {
  return `${getSellProductCodePrefix(categoryName)}-${String(id).padStart(4, "0")}`;
}

export function isManagedSellProductCode(
  code: string | null | undefined,
  id: number | string,
) {
  if (!code) {
    return false;
  }

  const [prefix, suffix] = code.split("-");
  const expectedSuffix = String(id).padStart(4, "0");
  const managedPrefixes = new Set([...Object.values(SELL_PRODUCT_PREFIXES), "PRD"]);

  return managedPrefixes.has(prefix) && suffix === expectedSuffix;
}

export function getSellProductDisplayCode(product: {
  id: number | string;
  internal_code?: string | null;
  category?:
    | { name?: string | null }
    | Array<{ name?: string | null }>
    | null;
}) {
  const category = Array.isArray(product.category)
    ? product.category[0]
    : product.category;

  return (
    product.internal_code ||
    formatSellProductCode(category?.name, product.id)
  );
}
