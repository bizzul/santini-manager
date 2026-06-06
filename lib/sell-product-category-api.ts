import type { SellCategoryViewMode } from "@/types/sell-product-category-cards";

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Operazione non riuscita",
    );
  }
  return data as T;
}

export async function saveSellProductCategoryViewMode(
  domain: string,
  viewMode: SellCategoryViewMode,
): Promise<void> {
  const response = await fetch("/api/settings/sell-product-categories-view", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ domain, viewMode }),
  });

  await parseResponse<{ success: boolean }>(response);
}

export async function reorderSellProductCategories(
  domain: string,
  orderedIds: number[],
): Promise<void> {
  const response = await fetch("/api/sell-products/categories/reorder", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-site-domain": domain,
    },
    body: JSON.stringify({ orderedIds }),
  });

  await parseResponse<{ success: boolean }>(response);
}

export async function reorderSellProductSubcategories(
  domain: string,
  categoryId: number,
  items: Array<{ subcategory_key: string; subcategory_name: string }>,
): Promise<void> {
  const response = await fetch(
    `/api/sell-products/categories/${categoryId}/subcategories/reorder`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-site-domain": domain,
      },
      body: JSON.stringify({ items }),
    },
  );

  await parseResponse<{ success: boolean }>(response);
}
