import {
  SELL_PRODUCT_CSV_COLUMNS,
  buildHierarchicalSellCsvContent,
  buildSellCsvContent,
  buildSellProductExportFilename,
  filterSellExportRows,
} from "@/lib/sell-product-csv-export";
import { EMPTY_SUBCATEGORY_KEY } from "@/lib/category-aggregation";

const sampleProducts = [
  {
    id: 10,
    internal_code: "ARR-001",
    category_id: 1,
    category: { id: 1, name: "Arredamento" },
    subcategory: "Cucina",
    tipo: "Mobile",
    name: "Armadio",
    description: "Armadio cucina",
    active: true,
  },
  {
    id: 11,
    category_id: 2,
    category: { id: 2, name: "Porte" },
    subcategory: "Interne",
    name: "Porta liscia",
    active: true,
  },
];

describe("sell product csv export", () => {
  it("keeps standard csv headers", () => {
    const content = buildSellCsvContent(sampleProducts);
    expect(content.split("\n")[0]).toBe(
      SELL_PRODUCT_CSV_COLUMNS.map((col) => col.header).join(","),
    );
  });

  it("filters export rows by category", () => {
    const filtered = filterSellExportRows(sampleProducts, {
      categoryId: 1,
      categoryName: "Arredamento",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Armadio");
  });

  it("filters export rows by subcategory key", () => {
    const filtered = filterSellExportRows(sampleProducts, {
      categoryId: 1,
      categoryName: "Arredamento",
      subcategoryKey: "Cucina",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].subcategory).toBe("Cucina");
  });

  it("filters empty subcategory bucket", () => {
    const filtered = filterSellExportRows(
      [
        {
          id: 12,
          category_id: 1,
          category: { id: 1, name: "Arredamento" },
          name: "Senza sottocategoria",
          active: true,
        },
      ],
      {
        categoryId: 1,
        categoryName: "Arredamento",
        subcategoryKey: EMPTY_SUBCATEGORY_KEY,
      },
    );

    expect(filtered).toHaveLength(1);
  });

  it("builds hierarchical csv grouped by category and subcategory", () => {
    const content = buildHierarchicalSellCsvContent(sampleProducts);

    expect(content).toContain("=== CATEGORIA: Arredamento ===");
    expect(content).toContain("=== CATEGORIA: Porte ===");
    expect(content).toContain("--- Sottocategoria: Cucina ---");
    expect(content).toContain("--- Sottocategoria: Interne ---");
  });

  it("builds sanitized export filenames", () => {
    expect(
      buildSellProductExportFilename({
        categoryName: "Arredamento",
        subcategoryName: "Cucina",
      }),
    ).toMatch(/^prodotti_Arredamento_Cucina_\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
