/**
 * Risolve gli ID categoria articolo associati a un task Kanban/mappa.
 * Unisce la categoria del SellProduct collegato e draft_category_ids.
 */
export function getTaskCategoryIds(task: {
  sellProduct?: {
    category?: { id?: number | string | null } | Array<{ id?: number | string | null }> | null;
    category_id?: number | string | null;
    categoryId?: number | string | null;
  } | null;
  SellProduct?: {
    category?: { id?: number | string | null } | Array<{ id?: number | string | null }> | null;
    category_id?: number | string | null;
    categoryId?: number | string | null;
  } | null;
  draft_category_ids?: number[] | null;
  draftCategoryIds?: number[] | null;
} | null | undefined): number[] {
  if (!task) return [];

  const ids = new Set<number>();
  const sellProduct = task.sellProduct || task.SellProduct;
  const rawCategory = sellProduct?.category;
  const categories = Array.isArray(rawCategory)
    ? rawCategory
    : rawCategory
      ? [rawCategory]
      : [];

  categories.forEach((category) => {
    const categoryId = Number(category?.id);
    if (Number.isFinite(categoryId)) {
      ids.add(categoryId);
    }
  });

  const directCategoryId = Number(
    sellProduct?.category_id ?? sellProduct?.categoryId,
  );
  if (Number.isFinite(directCategoryId)) {
    ids.add(directCategoryId);
  }

  const draftCategoryIds = task.draft_category_ids ?? task.draftCategoryIds;
  if (Array.isArray(draftCategoryIds)) {
    draftCategoryIds.forEach((categoryId) => {
      const normalizedCategoryId = Number(categoryId);
      if (Number.isFinite(normalizedCategoryId)) {
        ids.add(normalizedCategoryId);
      }
    });
  }

  return Array.from(ids);
}
