import {
  calcolaTotaleRiga,
  calcolaTotaliDocumento,
  roundCurrency,
} from "@/lib/documenti/calcolo-totali";
import { assignArtCodes } from "@/lib/documenti/art-codes";

describe("calcolaTotaleRiga", () => {
  it("calcola senza sconto", () => {
    expect(calcolaTotaleRiga(15400, 3.9, null)).toBe(60060);
  });

  it("calcola con sconto percentuale", () => {
    expect(calcolaTotaleRiga(100, 10, 10)).toBe(900);
  });

  it("ignora sconto per FATTURA", () => {
    expect(calcolaTotaleRiga(100, 10, 10, "FATTURA")).toBe(1000);
  });
});

describe("calcolaTotaliDocumento", () => {
  it("calcola tot netto, IVA 8.1% e totale CHF", () => {
    const righe = [
      { quantita: 15400, prezzoUnitario: 3.9, sconto: null },
      { quantita: 1500, prezzoUnitario: 8.7, sconto: null },
      { quantita: 1, prezzoUnitario: 490, sconto: null },
    ];
    const totali = calcolaTotaliDocumento(righe, "OFFERTA");
    expect(totali.totNetto).toBe(73600);
    expect(totali.iva).toBe(5961.6);
    expect(totali.totaleCHF).toBe(79561.6);
  });

  it("calcola totali fattura senza sconto", () => {
    const righe = [{ quantita: 1, prezzoUnitario: 4200, sconto: null }];
    const totali = calcolaTotaliDocumento(righe, "FATTURA");
    expect(totali.totNetto).toBe(4200);
    expect(totali.iva).toBe(340.2);
    expect(totali.totaleCHF).toBe(4540.2);
  });
});

describe("roundCurrency", () => {
  it("arrotonda a 2 decimali", () => {
    expect(roundCurrency(79561.600000000006)).toBe(79561.6);
  });
});

describe("assignArtCodes", () => {
  it("assegna HO-01, HO-02 e TR-01", () => {
    const codes = assignArtCodes([
      { isTrasporto: false },
      { isTrasporto: false },
      { isTrasporto: true },
    ]);
    expect(codes).toEqual(["HO-01", "HO-02", "TR-01"]);
  });
});
