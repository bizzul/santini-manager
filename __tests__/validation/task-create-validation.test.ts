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
});
