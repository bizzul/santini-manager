import { AIRigaSchema } from "@/validation/documenti/extracted-document";

describe("AIRigaSchema", () => {
  const baseRiga = {
    descrizione: "Articolo test",
    misure: null,
    unita: "Pz." as const,
    isTrasporto: false,
  };

  it("accetta prezzoUnitario e quantita come stringhe numeriche", () => {
    const result = AIRigaSchema.safeParse({
      ...baseRiga,
      quantita: "10",
      prezzoUnitario: "150.50",
      sconto: "5",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantita).toBe(10);
      expect(result.data.prezzoUnitario).toBe(150.5);
      expect(result.data.sconto).toBe(5);
    }
  });

  it("accetta formati svizzeri con virgola e CHF", () => {
    const result = AIRigaSchema.safeParse({
      ...baseRiga,
      quantita: 2,
      prezzoUnitario: "CHF 1'250,00",
      sconto: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prezzoUnitario).toBe(1250);
    }
  });

  it("accetta isTrasporto come stringa", () => {
    const result = AIRigaSchema.safeParse({
      ...baseRiga,
      quantita: 1,
      prezzoUnitario: 100,
      sconto: null,
      isTrasporto: "true",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isTrasporto).toBe(true);
    }
  });
});
