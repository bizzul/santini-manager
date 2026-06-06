import {
  INVENTORY_CSV_COLUMNS,
  buildCsvContent,
  buildHierarchicalInventoryCsvContent,
  buildInventoryExportFilename,
  escapeCSVValue,
  filterExportRows,
  flattenInventoryItemsToRows,
  sanitizeExportFilenamePart,
} from "@/lib/inventory-csv-export";
import { EMPTY_SUBCATEGORY_KEY } from "@/lib/category-aggregation";

const sampleItems = [
  {
    name: "Pannello MDF",
    description: "MDF 19mm",
    category: { id: "cat-1", name: "Legno", code: "LEG" },
    supplier: { name: "Fornitore A" },
    variants: [
      {
        id: "var-1",
        internal_code: "MDF-19",
        stock_quantity: 30,
        purchase_unit_price: 18,
        sell_unit_price: 25,
        attributes: {
          subcategory: "Pannelli",
          subcategory_code: "PAN",
          color: "Bianco",
        },
      },
    ],
  },
  {
    name: "Cerniera",
    category: { id: "cat-1", name: "Legno", code: "LEG" },
    variants: [
      {
        id: "var-2",
        stock_quantity: 5,
        purchase_unit_price: 10,
        attributes: {
          subcategory: "Ferramenta",
        },
      },
    ],
  },
  {
    name: "Bordo ABS",
    category: { id: "cat-2", name: "Bordi", code: "BOR" },
    variants: [
      {
        id: "var-3",
        stock_quantity: 12,
        purchase_unit_price: 4,
        attributes: {
          subcategory: "Bordi ABS",
        },
      },
    ],
  },
];

describe("inventory csv export", () => {
  const rows = flattenInventoryItemsToRows(sampleItems);

  it("flattens inventory items into export rows", () => {
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      variant_id: "var-1",
      category: "Legno",
      category_code: "LEG",
      subcategory: "Pannelli",
      quantity: 30,
      unit_price: 18,
    });
  });

  it("keeps standard csv headers", () => {
    const content = buildCsvContent(rows);
    const header = content.split("\n")[0];
    expect(header).toBe(INVENTORY_CSV_COLUMNS.map((col) => col.header).join(","));
  });

  it("escapes csv values with commas and quotes", () => {
    expect(escapeCSVValue('valore, con "virgole"')).toBe(
      '"valore, con ""virgole"""',
    );
  });

  it("filters export rows by category code", () => {
    const filtered = filterExportRows(rows, {
      categoryId: "cat-1",
      categoryCode: "LEG",
      categoryName: "Legno",
    });

    expect(filtered).toHaveLength(2);
    expect(filtered.every((row) => row.category_code === "LEG")).toBe(true);
  });

  it("filters export rows by subcategory key", () => {
    const filtered = filterExportRows(rows, {
      categoryId: "cat-1",
      categoryCode: "LEG",
      categoryName: "Legno",
      subcategoryKey: "Pannelli",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].subcategory).toBe("Pannelli");
  });

  it("filters empty subcategory bucket", () => {
    const rowsWithEmpty = flattenInventoryItemsToRows([
      {
        name: "Senza sottocategoria",
        category: { name: "Legno", code: "LEG" },
        variants: [
          {
            id: "var-empty",
            stock_quantity: 1,
            purchase_unit_price: 2,
            attributes: {},
          },
        ],
      },
    ]);

    const filtered = filterExportRows(rowsWithEmpty, {
      categoryCode: "LEG",
      categoryName: "Legno",
      subcategoryKey: EMPTY_SUBCATEGORY_KEY,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Senza sottocategoria");
  });

  it("builds hierarchical csv grouped by category and subcategory", () => {
    const content = buildHierarchicalInventoryCsvContent(rows);

    expect(content).toContain("=== CATEGORIA: Bordi (BOR) ===");
    expect(content).toContain("=== CATEGORIA: Legno (LEG) ===");
    expect(content).toContain("--- Sottocategoria: Pannelli (PAN) ---");
    expect(content).toContain("--- Sottocategoria: Ferramenta ---");
    expect(content.split(INVENTORY_CSV_COLUMNS[0].header).length).toBeGreaterThan(
      2,
    );
  });

  it("builds sanitized export filenames", () => {
    expect(sanitizeExportFilenamePart("Pannelli MDF!")).toBe("Pannelli_MDF");
    expect(
      buildInventoryExportFilename({
        categoryCode: "LEG",
        subcategoryName: "Pannelli",
      }),
    ).toMatch(/^inventario_LEG_Pannelli_\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
