import {
  aggregateCategoryCards,
  aggregateSubcategoryCards,
  countMergedSubcategories,
  filterInventoryByCategoryAndSubcategory,
  EMPTY_SUBCATEGORY_KEY,
  EMPTY_SUBCATEGORY_LABEL,
} from "@/lib/category-aggregation";
import type { InventoryCategory } from "@/types/supabase";

const categories: InventoryCategory[] = [
  {
    id: "cat-1",
    site_id: "site-1",
    name: "Bordi",
    code: "BOR",
  },
  {
    id: "cat-2",
    site_id: "site-1",
    name: "Vuota",
    code: "VUO",
  },
];

const inventoryRows = [
  {
    category_id: "cat-1",
    subcategory: "Bordi ABS",
    stock_quantity: 10,
    purchase_unit_price: 5,
  },
  {
    category_id: "cat-1",
    subcategory: "Bordi ABS",
    stock_quantity: 2,
    purchase_unit_price: null,
  },
  {
    category_id: "cat-1",
    attributes: { subcategory: "Cerniere" },
    quantity: 3,
    unit_price: 20,
  },
  {
    category_id: "cat-1",
    stock_quantity: 0,
    purchase_unit_price: 100,
  },
];

describe("category aggregation", () => {
  it("aggregates category cards with null-safe totals", () => {
    const cards = aggregateCategoryCards(categories, inventoryRows);

    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({
      id: "cat-1",
      pieces: 15,
      totalValue: 110,
      itemCount: 4,
      subcategoryCount: 3,
    });
    expect(cards[1]).toMatchObject({
      id: "cat-2",
      pieces: 0,
      totalValue: 0,
      itemCount: 0,
    });
  });

  it("aggregates subcategory cards and buckets empty names", () => {
    const cards = aggregateSubcategoryCards("cat-1", inventoryRows);

    expect(cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "Bordi ABS",
          name: "Bordi ABS",
          pieces: 12,
          totalValue: 50,
          itemCount: 2,
        }),
        expect.objectContaining({
          key: "Cerniere",
          name: "Cerniere",
          pieces: 3,
          totalValue: 60,
          itemCount: 1,
        }),
        expect.objectContaining({
          key: EMPTY_SUBCATEGORY_KEY,
          name: EMPTY_SUBCATEGORY_LABEL,
          pieces: 0,
          totalValue: 0,
          itemCount: 1,
        }),
      ]),
    );
  });

  it("counts merged subcategories including metadata-only entries", () => {
    const count = countMergedSubcategories("cat-1", inventoryRows, [
      {
        subcategory_key: "Lamellare",
        subcategory_name: "Lamellare",
      },
      {
        subcategory_key: "Profili",
        subcategory_name: "Profili",
      },
    ]);

    expect(count).toBe(5);
  });

  it("filters inventory rows by category and subcategory", () => {
    const filtered = filterInventoryByCategoryAndSubcategory(
      inventoryRows,
      "cat-1",
      "Bordi ABS",
    );

    expect(filtered).toHaveLength(2);
  });
});
