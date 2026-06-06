import type { InventoryCategory } from "@/types/supabase";

type CategoryPayload = Pick<
  InventoryCategory,
  "name" | "code" | "description" | "image_url"
>;

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Operazione non riuscita",
    );
  }
  return data as T;
}

export async function createInventoryCategory(
  domain: string,
  payload: CategoryPayload,
): Promise<InventoryCategory> {
  const response = await fetch("/api/inventory/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-site-domain": domain,
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<InventoryCategory>(response);
}

export async function updateInventoryCategory(
  domain: string,
  id: string,
  payload: CategoryPayload,
): Promise<InventoryCategory> {
  const response = await fetch("/api/inventory/categories", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-site-domain": domain,
    },
    body: JSON.stringify({ id, ...payload }),
  });

  return parseResponse<InventoryCategory>(response);
}

export async function deleteInventoryCategory(
  domain: string,
  id: string,
): Promise<void> {
  const response = await fetch(`/api/inventory/categories?id=${id}`, {
    method: "DELETE",
    headers: {
      "x-site-domain": domain,
    },
  });

  await parseResponse<{ success: boolean }>(response);
}

export async function saveInventoryCategoryViewMode(
  domain: string,
  viewMode: "table" | "grid",
): Promise<void> {
  const response = await fetch("/api/settings/inventory-categories-view", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ domain, viewMode }),
  });

  await parseResponse<{ success: boolean }>(response);
}

export async function reorderInventoryCategories(
  domain: string,
  orderedIds: string[],
): Promise<void> {
  const response = await fetch("/api/inventory/categories/reorder", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-site-domain": domain,
    },
    body: JSON.stringify({ orderedIds }),
  });

  await parseResponse<{ success: boolean }>(response);
}

export async function reorderInventorySubcategories(
  domain: string,
  categoryId: string,
  items: Array<{ subcategory_key: string; subcategory_name: string }>,
): Promise<void> {
  const response = await fetch(
    `/api/inventory/categories/${categoryId}/subcategories/reorder`,
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
