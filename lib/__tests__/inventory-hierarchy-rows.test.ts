import {
  aggregateCategoryCards,
  EMPTY_SUBCATEGORY_KEY,
} from "@/lib/category-aggregation";
import {
  buildSearchExpandedSets,
  buildVisibleHierarchyRows,
  filterHierarchyRowsBySearch,
} from "@/lib/inventory-hierarchy-rows";
import { getSubcategoryExpansionKey } from "@/types/inventory-hierarchy";
import type { InventoryCategory } from "@/types/supabase";
import type { InventoryRow } from "@/app/sites/[domain]/inventory/columns";

const categories: InventoryCategory[] = [
  {
    id: "cat-1",
    site_id: "site-1",
    name: "Legno",
    code: "LEG",
  },
];

const inventory: InventoryRow[] = [
  {
    id: "row-1",
    item_id: "item-1",
    site_id: "site-1",
    name: "Pannello MDF",
    category_id: "cat-1",
    is_stocked: true,
    is_consumable: false,
    is_active: true,
    subcategory: "Pannelli",
    stock_quantity: 30,
    quantity: 30,
    purchase_unit_price: 18,
  },
  {
    id: "row-2",
    item_id: "item-2",
    site_id: "site-1",
    name: "Pannello truciolato",
    category_id: "cat-1",
    is_stocked: true,
    is_consumable: false,
    is_active: true,
    subcategory: "Pannelli",
    stock_quantity: 50,
    quantity: 50,
    purchase_unit_price: 61,
  },
  {
    id: "row-3",
    item_id: "item-3",
    site_id: "site-1",
    name: "Cerniera",
    category_id: "cat-1",
    is_stocked: true,
    is_consumable: false,
    is_active: true,
    subcategory: "Ferramenta",
    stock_quantity: 5,
    quantity: 5,
    purchase_unit_price: 10,
  },
];

describe("inventory hierarchy rows", () => {
  const categoryCards = aggregateCategoryCards(categories, inventory);

  it("returns only category rows when nothing is expanded", () => {
    const rows = buildVisibleHierarchyRows({
      categoryCards,
      inventory,
      subcategoryImages: [],
      expandedCategories: new Set(),
      expandedSubcategories: new Set(),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: "category",
      categoryId: "cat-1",
      totalValue: 3640,
      itemCount: 3,
      subcategoryCount: 2,
    });
  });

  it("counts metadata-only subcategories on category rows", () => {
    const rows = buildVisibleHierarchyRows({
      categoryCards,
      inventory,
      subcategoryImages: [
        {
          category_id: "cat-1",
          subcategory_key: "Lamellare",
          subcategory_name: "Lamellare",
          image_url: "https://example.com/lamellare.webp",
        },
        {
          category_id: "cat-1",
          subcategory_key: "Profili",
          subcategory_name: "Profili",
          image_url: null,
        },
      ],
      expandedCategories: new Set(["cat-1"]),
      expandedSubcategories: new Set(),
    });

    expect(rows[0]).toMatchObject({
      type: "category",
      subcategoryCount: 4,
    });
    expect(rows.find((row) => row.subcategoryName === "Lamellare")).toMatchObject({
      type: "subcategory",
      subcategoryCard: expect.objectContaining({
        image_url: "https://example.com/lamellare.webp",
      }),
    });
  });

  it("adds subcategory rows when category is expanded", () => {
    const rows = buildVisibleHierarchyRows({
      categoryCards,
      inventory,
      subcategoryImages: [],
      expandedCategories: new Set(["cat-1"]),
      expandedSubcategories: new Set(),
    });

    expect(rows.map((row) => row.type)).toEqual([
      "category",
      "subcategory",
      "subcategory",
    ]);
    expect(rows[1]).toMatchObject({
      type: "subcategory",
      subcategoryName: "Ferramenta",
      totalValue: 50,
      itemCount: 1,
    });
    expect(rows[2]).toMatchObject({
      type: "subcategory",
      subcategoryName: "Pannelli",
      totalValue: 3590,
      itemCount: 2,
    });
  });

  it("adds article rows when subcategory is expanded", () => {
    const expansionKey = getSubcategoryExpansionKey("cat-1", "Pannelli");

    const rows = buildVisibleHierarchyRows({
      categoryCards,
      inventory,
      subcategoryImages: [],
      expandedCategories: new Set(["cat-1"]),
      expandedSubcategories: new Set([expansionKey]),
    });

    expect(rows.map((row) => row.type)).toEqual([
      "category",
      "subcategory",
      "subcategory",
      "article",
      "article",
    ]);
    expect(rows[2]).toMatchObject({
      type: "subcategory",
      subcategoryName: "Pannelli",
      totalValue: 3590,
    });
    expect(rows[3]).toMatchObject({
      type: "article",
      totalValue: 540,
      article: expect.objectContaining({ name: "Pannello MDF" }),
    });
    expect(rows[4]).toMatchObject({
      type: "article",
      totalValue: 3050,
    });
  });

  it("filters visible categories", () => {
    const rows = buildVisibleHierarchyRows({
      categoryCards,
      inventory,
      subcategoryImages: [],
      expandedCategories: new Set(),
      expandedSubcategories: new Set(),
      visibleCategoryIds: new Set(),
    });

    expect(rows).toHaveLength(0);
  });

  it("filters rows by search query", () => {
    const searchExpansion = buildSearchExpandedSets(
      categoryCards,
      inventory,
      "cerniera",
    );
    const rows = buildVisibleHierarchyRows({
      categoryCards,
      inventory,
      subcategoryImages: [],
      expandedCategories: searchExpansion.categories,
      expandedSubcategories: searchExpansion.subcategories,
    });

    const filtered = filterHierarchyRowsBySearch(rows, "cerniera");

    expect(filtered.map((row) => row.type)).toEqual([
      "category",
      "subcategory",
      "article",
    ]);
    expect(filtered[1]).toMatchObject({
      subcategoryName: "Ferramenta",
    });
  });

  it("handles empty subcategory bucket key", () => {
    const inventoryWithEmpty = [
      ...inventory,
      {
        id: "row-4",
        item_id: "item-4",
        site_id: "site-1",
        name: "Senza etichetta",
        category_id: "cat-1",
        is_stocked: true,
        is_consumable: false,
        is_active: true,
        stock_quantity: 1,
        quantity: 1,
        purchase_unit_price: 2,
      },
    ];

    const cards = aggregateCategoryCards(categories, inventoryWithEmpty);
    const rows = buildVisibleHierarchyRows({
      categoryCards: cards,
      inventory: inventoryWithEmpty,
      subcategoryImages: [],
      expandedCategories: new Set(["cat-1"]),
      expandedSubcategories: new Set(),
    });

    expect(
      rows.some(
        (row) =>
          row.type === "subcategory" &&
          row.subcategoryKey === EMPTY_SUBCATEGORY_KEY,
      ),
    ).toBe(true);
  });
});
