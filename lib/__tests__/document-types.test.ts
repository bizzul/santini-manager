import {
  DOCUMENT_TYPES,
  getDocumentTypeConfig,
  isCommercialType,
  isLetterType,
  getDocumentTypeLabel,
} from "@/lib/documenti/document-types";

describe("document-types", () => {
  it("defines 8 extensible document types", () => {
    expect(DOCUMENT_TYPES).toHaveLength(8);
    expect(DOCUMENT_TYPES.map((t) => t.id)).toEqual([
      "OFFERTA",
      "CONFERMA",
      "FATTURA",
      "PREVENTIVO",
      "LETTERA_UFFICIALE",
      "RISPOSTA_COMUNICAZIONE",
      "SOLLECITO_PAGAMENTO",
      "COMUNICAZIONE_GENERICA",
    ]);
  });

  it("maps commercial types to line items and numbering", () => {
    for (const id of ["OFFERTA", "CONFERMA", "FATTURA", "PREVENTIVO"]) {
      const config = getDocumentTypeConfig(id);
      expect(config?.category).toBe("commercial");
      expect(config?.hasLineItems).toBe(true);
      expect(config?.hasNumber).toBe(true);
      expect(isCommercialType(id)).toBe(true);
      expect(isLetterType(id)).toBe(false);
    }
  });

  it("maps letter types to prose without line items", () => {
    for (const id of [
      "LETTERA_UFFICIALE",
      "RISPOSTA_COMUNICAZIONE",
      "SOLLECITO_PAGAMENTO",
      "COMUNICAZIONE_GENERICA",
    ]) {
      const config = getDocumentTypeConfig(id);
      expect(config?.category).toBe("letter");
      expect(config?.hasLineItems).toBe(false);
      expect(config?.hasNumber).toBe(false);
      expect(isLetterType(id)).toBe(true);
      expect(isCommercialType(id)).toBe(false);
    }
  });

  it("FATTURA hides discount, others commercial show it", () => {
    expect(getDocumentTypeConfig("FATTURA")?.showDiscount).toBe(false);
    expect(getDocumentTypeConfig("OFFERTA")?.showDiscount).toBe(true);
  });

  it("returns human labels", () => {
    expect(getDocumentTypeLabel("PREVENTIVO")).toBe("Preventivo");
    expect(getDocumentTypeLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});
