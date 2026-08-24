import { validation } from "@/validation/task/create";

describe("task create validation", () => {
  it("accepts voice-created tasks without productId", () => {
    const result = validation.safeParse({
      kanbanId: 17,
      clientId: 42,
      name: "ESPOSIZIONE",
      luogo: "Giubiasco",
      sellPrice: 1100,
      numero_pezzi: null,
      other: "Trascrizione originale: crea progetto per Santini SA",
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error("Expected validation to succeed");
    }

    expect(result.data.productId).toBeUndefined();
    expect(result.data.sellPrice).toBe(1100);
  });

  it("accepts null productId when no product is linked", () => {
    const result = validation.safeParse({
      kanbanId: 17,
      name: "Progetto vocale",
      sellPrice: 0,
      productId: null,
    });

    expect(result.success).toBe(true);
  });

  it("accepts offer create payload with null optional strings", () => {
    const result = validation.safeParse({
      unique_code: null,
      name: null,
      luogo: null,
      other: null,
      clientId: null,
      productId: null,
      sellPrice: 0,
      numero_pezzi: 0,
      kanbanId: 5,
      kanbanColumnId: 10,
      isDraft: false,
      offerProducts: [],
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.error.message);
    }
    expect(result.data.unique_code).toBeUndefined();
    expect(result.data.name).toBeUndefined();
    expect(result.data.luogo).toBeUndefined();
    expect(result.data.other).toBeUndefined();
  });

  it("treats empty unique_code as unset so the server can generate it", () => {
    const result = validation.safeParse({
      unique_code: "",
      sellPrice: 0,
      kanbanId: 5,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.error.message);
    }
    expect(result.data.unique_code).toBeUndefined();
  });
});
