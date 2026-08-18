import {
  PROJECT_PRODUCT_CATEGORIES,
  buildProjectCategoryTaskOrFilter,
  parseProjectCategorySlug,
  projectCategoryNameForSlug,
} from "@/lib/project-categories";

describe("project category nav", () => {
  it("exposes the six product categories in menu order", () => {
    expect(PROJECT_PRODUCT_CATEGORIES.map((category) => category.slug)).toEqual([
      "arredamento",
      "porte",
      "serramenti",
      "accessori",
      "posa",
      "service",
    ]);
  });

  it("parses known slugs and rejects unknown values", () => {
    expect(parseProjectCategorySlug("Porte")).toBe("porte");
    expect(parseProjectCategorySlug(["serramenti"])).toBe("serramenti");
    expect(parseProjectCategorySlug("unknown")).toBeNull();
    expect(parseProjectCategorySlug(undefined)).toBeNull();
  });

  it("maps slugs to sellproduct_categories names", () => {
    expect(projectCategoryNameForSlug("arredamento")).toBe("Arredamento");
    expect(projectCategoryNameForSlug("posa")).toBe("Posa");
  });

  it("builds a server-side or-filter for product and draft categories", () => {
    expect(buildProjectCategoryTaskOrFilter([], [10])).toBeNull();
    expect(buildProjectCategoryTaskOrFilter([3], [])).toBe(
      "draft_category_ids.ov.{3}",
    );
    expect(buildProjectCategoryTaskOrFilter([3, 4], [10, 11])).toBe(
      "sellProductId.in.(10,11),draft_category_ids.ov.{3,4}",
    );
  });
});
