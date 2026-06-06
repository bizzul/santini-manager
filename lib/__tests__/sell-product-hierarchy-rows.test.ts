import { aggregateSellCategoryCards } from "@/lib/sell-product-category-aggregation";
import {
  buildSellSearchExpandedSets,
  buildVisibleSellHierarchyRows,
} from "@/lib/sell-product-hierarchy-rows";
import { getSellSubcategoryExpansionKey } from "@/types/sell-product-hierarchy";
import type { SellProductCategory } from "@/types/supabase";
import type { SellProductWithAction } from "@/app/sites/[domain]/products/columns";

const categories: SellProductCategory[] = [
  {
    id: 1,
    site_id: "site-1",
    name: "Arredamento",
    color: "#3B82F6",
  },
];

const products: SellProductWithAction[] = [
  {
    id: 10,
    site_id: "site-1",
    name: "Armadio",
    category_id: 1,
    category: { id: 1, site_id: "site-1", name: "Arredamento" },
    subcategory: "Cucina",
    active: true,
  },
  {
    id: 11,
    site_id: "site-1",
    name: "Tavolo",
    category_id: 1,
    category: { id: 1, site_id: "site-1", name: "Arredamento" },
    subcategory: "Cucina",
    active: true,
  },
];

describe("sell product hierarchy rows", () => {
  const categoryCards = aggregateSellCategoryCards(categories, products);

  it("returns category rows with merged subcategory count", () => {
    const rows = buildVisibleSellHierarchyRows({
      categoryCards,
      products,
      subcategoryImages: [
        {
          category_id: 1,
          subcategory_key: "Soggiorno",
          subcategory_name: "Soggiorno",
          image_url: null,
        },
      ],
      expandedCategories: new Set(),
      expandedSubcategories: new Set(),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: "category",
      categoryId: "1",
      itemCount: 2,
      subcategoryCount: 2,
    });
  });

  it("shows subcategory image and products when expanded", () => {
    const expansionKey = getSellSubcategoryExpansionKey("1", "Cucina");

    const rows = buildVisibleSellHierarchyRows({
      categoryCards,
      products,
      subcategoryImages: [
        {
          category_id: 1,
          subcategory_key: "Cucina",
          subcategory_name: "Cucina",
          image_url: "https://example.com/cucina.webp",
        },
      ],
      expandedCategories: new Set(["1"]),
      expandedSubcategories: new Set([expansionKey]),
    });

    expect(rows.map((row) => row.type)).toEqual([
      "category",
      "subcategory",
      "product",
      "product",
    ]);
    expect(rows[1]).toMatchObject({
      subcategoryName: "Cucina",
      subcategoryCard: expect.objectContaining({
        image_url: "https://example.com/cucina.webp",
      }),
    });
  });

  it("expands search matches automatically", () => {
    const searchExpansion = buildSellSearchExpandedSets(
      categoryCards,
      products,
      "armadio",
    );

    const rows = buildVisibleSellHierarchyRows({
      categoryCards,
      products,
      subcategoryImages: [],
      expandedCategories: searchExpansion.categories,
      expandedSubcategories: searchExpansion.subcategories,
    });

    expect(rows.some((row) => row.type === "product" && row.product?.name === "Armadio")).toBe(
      true,
    );
  });
});
