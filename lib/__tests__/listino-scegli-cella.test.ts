import {
  scegliCellaPiuSpecifica,
  type CellaGriglia,
} from "@/lib/listino/scegli-cella";

const cella = (
  wMin: number,
  wMax: number,
  hMin: number,
  hMax: number,
  prezzo: number,
): CellaGriglia => ({
  larghezza_min_mm: wMin,
  larghezza_max_mm: wMax,
  altezza_min_mm: hMin,
  altezza_max_mm: hMax,
  prezzo_base_chf: prezzo,
});

describe("scegliCellaPiuSpecifica", () => {
  it("non trova nulla fuori dalle fasce", () => {
    const celle = [cella(400, 600, 400, 600, 1015)];
    expect(scegliCellaPiuSpecifica(celle, 2000, 2000)).toBeNull();
  });

  it("prende la cella che contiene la misura", () => {
    const celle = [
      cella(400, 600, 400, 600, 1015),
      cella(601, 800, 601, 800, 1170),
    ];
    const scelta = scegliCellaPiuSpecifica(celle, 700, 700);
    expect(scelta?.prezzo_base_chf).toBe(1170);
  });

  it("include gli estremi della fascia", () => {
    const celle = [cella(601, 800, 601, 800, 1170)];
    expect(scegliCellaPiuSpecifica(celle, 601, 800)?.prezzo_base_chf).toBe(1170);
    expect(scegliCellaPiuSpecifica(celle, 800, 601)?.prezzo_base_chf).toBe(1170);
  });

  it("su fasce sovrapposte prende la piu' stretta, non la piu' economica", () => {
    const larga = cella(400, 2400, 400, 2400, 900);
    const stretta = cella(601, 800, 601, 800, 1170);
    expect(
      scegliCellaPiuSpecifica([larga, stretta], 700, 700)?.prezzo_base_chf,
    ).toBe(1170);
    // L'ordine in cui arrivano le righe non deve cambiare il prezzo.
    expect(
      scegliCellaPiuSpecifica([stretta, larga], 700, 700)?.prezzo_base_chf,
    ).toBe(1170);
  });

  it("a parita' di ampiezza prende la piu' cara", () => {
    const economica = cella(601, 800, 601, 800, 1000);
    const cara = cella(601, 800, 601, 800, 1170);
    expect(
      scegliCellaPiuSpecifica([economica, cara], 700, 700)?.prezzo_base_chf,
    ).toBe(1170);
    expect(
      scegliCellaPiuSpecifica([cara, economica], 700, 700)?.prezzo_base_chf,
    ).toBe(1170);
  });
});
