import {
  getProductCategoryLabel,
  getProductCategoryLabelAndColor,
  normalizeSupabaseRelation,
} from "@/lib/product-category-label";

describe("lib/product-category-label", () => {
  describe("normalizeSupabaseRelation", () => {
    it("returns null for null/undefined", () => {
      expect(normalizeSupabaseRelation(null)).toBeNull();
      expect(normalizeSupabaseRelation(undefined)).toBeNull();
    });

    it("returns the first element of an array relation", () => {
      expect(normalizeSupabaseRelation([{ name: "A" }, { name: "B" }])).toEqual({
        name: "A",
      });
    });

    it("returns null for empty array", () => {
      expect(normalizeSupabaseRelation([])).toBeNull();
    });

    it("returns the same object for single relation", () => {
      const relation = { name: "Single" };
      expect(normalizeSupabaseRelation(relation)).toBe(relation);
    });
  });

  describe("getProductCategoryLabel", () => {
    it("reads from SellProduct.category (object form)", () => {
      expect(
        getProductCategoryLabel({
          SellProduct: { category: { name: "Legno" } },
        }),
      ).toBe("Legno");
    });

    it("reads from SellProduct.category (array form)", () => {
      expect(
        getProductCategoryLabel({
          SellProduct: { category: [{ name: "Metallo" }] },
        }),
      ).toBe("Metallo");
    });

    it("reads from direct category field", () => {
      expect(
        getProductCategoryLabel({ category: { name: "Vernici" } }),
      ).toBe("Vernici");
    });

    it("accepts plain string category", () => {
      expect(getProductCategoryLabel({ category: "Custom" })).toBe("Custom");
    });

    it("falls back to default when nothing matches", () => {
      expect(getProductCategoryLabel({ SellProduct: null })).toBe(
        "Senza categoria",
      );
      expect(
        getProductCategoryLabel(null as any, "Altro"),
      ).toBe("Altro");
    });

    it("ignores empty strings", () => {
      expect(
        getProductCategoryLabel({
          category: "  ",
          SellProduct: { category: { name: "Fallback" } },
        }),
      ).toBe("Fallback");
    });
  });

  describe("getProductCategoryLabelAndColor", () => {
    it("returns both label and color when available", () => {
      expect(
        getProductCategoryLabelAndColor({
          SellProduct: { category: { name: "Legno", color: "#aabbcc" } },
        }),
      ).toEqual({ label: "Legno", color: "#aabbcc" });
    });

    it("returns null color when missing", () => {
      expect(
        getProductCategoryLabelAndColor({ category: "Senza colore" }),
      ).toEqual({ label: "Senza colore", color: null });
    });
  });
});
