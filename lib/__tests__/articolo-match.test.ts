import {
  classifyArticoloMatch,
  resolvePrezzoUnitario,
} from "@/lib/documenti/articolo-match";
import type { AIRiga } from "@/validation/documenti/extracted-document";
import type { ArticoloMatch } from "@/lib/documenti/search-tools";

const baseRiga = (): AIRiga => ({
  descrizione: "Porta in legno alluminio",
  misure: null,
  unita: "Pz.",
  quantita: 1,
  prezzoUnitario: 1000,
  sconto: null,
  isTrasporto: false,
});

const candidate = (
  overrides: Partial<ArticoloMatch> = {},
): ArticoloMatch => ({
  id: 10,
  codice: "HO-01",
  descrizione: "Porta in legno alluminio per capannone",
  prezzo: 850,
  unita: "Pz.",
  immagineUrl: "https://example.com/img.png",
  score: 0.9,
  source: "sell_product",
  ...overrides,
});

describe("classifyArticoloMatch", () => {
  it("ritorna high per score elevato", () => {
    const result = classifyArticoloMatch(baseRiga(), [candidate()]);
    expect(result.level).toBe("high");
    expect(result.articolo?.id).toBe(10);
  });

  it("ritorna high per codice esatto nel testo", () => {
    const result = classifyArticoloMatch(
      { ...baseRiga(), descrizione: "Articolo HO-01 per capannone" },
      [candidate({ score: 0.4 })],
    );
    expect(result.level).toBe("high");
  });

  it("ritorna suggested se candidati troppo vicini", () => {
    const result = classifyArticoloMatch(baseRiga(), [
      candidate({ id: 1, score: 0.7 }),
      candidate({ id: 2, score: 0.68 }),
    ]);
    expect(result.level).toBe("suggested");
    expect(result.articolo).toBeNull();
    expect(result.candidates).toHaveLength(2);
  });

  it("ritorna none sotto soglia minima", () => {
    const result = classifyArticoloMatch(baseRiga(), [
      candidate({ score: 0.3 }),
    ]);
    expect(result.level).toBe("none");
  });
});

describe("resolvePrezzoUnitario", () => {
  it("mantiene prezzo negoziato se > 0", () => {
    expect(resolvePrezzoUnitario(1000, 850)).toBe(1000);
  });

  it("usa listino se testo senza prezzo", () => {
    expect(resolvePrezzoUnitario(0, 850)).toBe(850);
  });
});
