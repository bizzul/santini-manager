/**
 * Product categories used by the Progetti sidebar submenu.
 * Slugs go in `?category=` on `/projects`; names match sellproduct_categories.name.
 */

export const PROJECT_PRODUCT_CATEGORIES = [
  {
    slug: "arredamento",
    name: "Arredamento",
    labelKey: "nav.projectsArredamento",
  },
  { slug: "porte", name: "Porte", labelKey: "nav.projectsPorte" },
  {
    slug: "serramenti",
    name: "Serramenti",
    labelKey: "nav.projectsSerramenti",
  },
  { slug: "accessori", name: "Accessori", labelKey: "nav.projectsAccessori" },
  { slug: "posa", name: "Posa", labelKey: "nav.projectsPosa" },
  { slug: "service", name: "Service", labelKey: "nav.projectsService" },
] as const;

export type ProjectCategorySlug =
  (typeof PROJECT_PRODUCT_CATEGORIES)[number]["slug"];

export function parseProjectCategorySlug(
  value: string | string[] | undefined | null,
): ProjectCategorySlug | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const slug = raw.trim().toLowerCase();
  return (
    PROJECT_PRODUCT_CATEGORIES.find((category) => category.slug === slug)
      ?.slug ?? null
  );
}

export function projectCategoryNameForSlug(
  slug: ProjectCategorySlug,
): string {
  return PROJECT_PRODUCT_CATEGORIES.find((category) => category.slug === slug)!
    .name;
}

/**
 * PostgREST `.or()` clause: task matches if its sell product is in the
 * category or draft_category_ids overlaps those category ids.
 */
export function buildProjectCategoryTaskOrFilter(
  categoryIds: number[],
  productIds: number[],
): string | null {
  if (categoryIds.length === 0) return null;
  const parts: string[] = [];
  if (productIds.length > 0) {
    parts.push(`sellProductId.in.(${productIds.join(",")})`);
  }
  parts.push(`draft_category_ids.ov.{${categoryIds.join(",")}}`);
  return parts.join(",");
}
