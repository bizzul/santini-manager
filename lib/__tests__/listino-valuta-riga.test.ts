import {
  valutaRiga,
  riepilogaAvvisi,
  type RigaValutata,
} from "@/lib/listino/valuta-riga";
import type {
  ListinoDataSource,
  ProdottoListino,
} from "@/lib/listino/calcola-prezzo";
import type { Supplemento } from "@/types/supabase";

// ---------------------------------------------------------------------------
// Data source in memoria che riproduce lo stato reale dello spazio Santini
// a novembre 2026: griglia attiva solo su alcune famiglie, coefficienti
// in parte ancora a 1.0000.
// ---------------------------------------------------------------------------

const PRODOTTI: Record<number, ProdottoListino> = {
  // Finestra 2 ante: griglia attiva, materiale PVC tarato, vetro a 1.0
  1: {
    id: 1,
    modalita_prezzo: "griglia",
    famiglia_apertura_cod: "FIN_BATT_2A",
    cod_materiale: "PVC",
    cod_vetro_telaio: "VC3",
  },
  // Scorrevole: griglia NON ancora caricata per questa famiglia
  2: {
    id: 2,
    modalita_prezzo: "griglia",
    famiglia_apertura_cod: "FIN_SCOR_A",
    cod_materiale: null,
    cod_vetro_telaio: null,
  },
  // Prodotto a listino fisso
  3: { id: 3, modalita_prezzo: "fisso", famiglia_apertura_cod: null },
  // Arredamento senza modalita definita (577 prodotti sono cosi')
  4: { id: 4, modalita_prezzo: null, famiglia_apertura_cod: null },
};

const GRIGLIA = [
  {
    famiglia: "FIN_BATT_2A",
    wMin: 1201,
    wMax: 1400,
    hMin: 1401,
    hMax: 1600,
    prezzo: 2055,
  },
];

const COEFFICIENTI: Record<string, number> = {
  PVC: 1.0,
  LEG: 2.0,
  VC3: 1.0,
};

const FISSI: Record<number, number> = { 3: 600 };

function makeDataSource(): ListinoDataSource {
  return {
    async getProdotto(ref) {
      if (ref.sellProductId == null) return null;
      return PRODOTTI[ref.sellProductId] ?? null;
    },
    async getPrezzoGriglia(famiglia, w, h) {
      const cella = GRIGLIA.find(
        (c) =>
          c.famiglia === famiglia &&
          w >= c.wMin &&
          w <= c.wMax &&
          h >= c.hMin &&
          h <= c.hMax,
      );
      return cella ? cella.prezzo : null;
    },
    async getPrezzoMisuraStandard() {
      return null;
    },
    async getPrezzoFisso(id) {
      return FISSI[id] ?? null;
    },
    async getCoefficiente(_categorie, codice) {
      return COEFFICIENTI[codice] ?? null;
    },
    async getIncrementiDimensionali() {
      return [];
    },
    async getSupplementi(): Promise<Supplemento[]> {
      return [];
    },
  };
}

describe("valutaRiga", () => {
  const ds = makeDataSource();

  it("quota una riga con griglia attiva e ne espone la catena di calcolo", async () => {
    const riga = await valutaRiga(
      { sellProductId: 1, larghezzaMm: 1400, altezzaMm: 1600, quantita: 3 },
      ds,
    );

    expect(riga.stato).toBe("quotata");
    expect(riga.prezzoUnitario).toBe(2055);
    expect(riga.totale).toBe(6165);
    expect(riga.breakdown).not.toBeNull();
    expect(riga.breakdown?.prezzoBase).toBe(2055);
    expect(riga.codiceErrore).toBeNull();
  });

  it("segnala i coefficienti ancora a 1.00 senza bloccare il prezzo", async () => {
    const riga = await valutaRiga(
      { sellProductId: 1, larghezzaMm: 1400, altezzaMm: 1600, quantita: 1 },
      ds,
    );

    const codici = riga.avvisi.map((a) => a.codice);
    expect(codici).toContain("COEFFICIENTE_NON_TARATO");
    expect(riga.avvisi.every((a) => a.severita === "media")).toBe(true);
    expect(riga.prezzoUnitario).toBeGreaterThan(0);
  });

  it("NON inventa un prezzo quando la griglia della famiglia non e' attiva", async () => {
    const riga = await valutaRiga(
      { sellProductId: 2, larghezzaMm: 3000, altezzaMm: 2400, quantita: 1 },
      ds,
    );

    expect(riga.stato).toBe("da_quotare");
    expect(riga.prezzoUnitario).toBe(0);
    expect(riga.totale).toBe(0);
    expect(riga.codiceErrore).toBe("FASCIA_NON_TROVATA");
    expect(riga.avvisi[0].codice).toBe("FUORI_GRIGLIA");
    expect(riga.avvisi[0].severita).toBe("alta");
  });

  it("accetta il prezzo manuale su una posizione non quotabile", async () => {
    const riga = await valutaRiga(
      { sellProductId: 2, larghezzaMm: 3000, altezzaMm: 2400, quantita: 1 },
      ds,
      { prezzoForzato: 4800 },
    );

    expect(riga.stato).toBe("manuale");
    expect(riga.prezzoUnitario).toBe(4800);
    expect(riga.totale).toBe(4800);
    expect(riga.codiceErrore).toBe("FASCIA_NON_TROVATA");
  });

  it("avvisa quando il prezzo forzato si scosta dal listino oltre la soglia", async () => {
    const riga = await valutaRiga(
      { sellProductId: 1, larghezzaMm: 1400, altezzaMm: 1600, quantita: 1 },
      ds,
      { prezzoForzato: 3000 },
    );

    expect(riga.stato).toBe("manuale");
    expect(riga.avvisi.map((a) => a.codice)).toContain("PREZZO_FORZATO");
  });

  it("non avvisa per uno scostamento entro la soglia", async () => {
    const riga = await valutaRiga(
      { sellProductId: 1, larghezzaMm: 1400, altezzaMm: 1600, quantita: 1 },
      ds,
      { prezzoForzato: 2100 },
    );

    expect(riga.avvisi.map((a) => a.codice)).not.toContain("PREZZO_FORZATO");
  });

  it("tratta un prodotto senza modalita_prezzo come da quotare", async () => {
    const riga = await valutaRiga({ sellProductId: 4, quantita: 1 }, ds);

    expect(riga.stato).toBe("da_quotare");
    expect(riga.codiceErrore).toBe("MODALITA_NON_DEFINITA");
    expect(riga.prezzoUnitario).toBe(0);
  });

  it("marca la riga libera e la blocca se non ha prezzo", async () => {
    const senzaPrezzo = await valutaRiga({ quantita: 2 }, ds);
    expect(senzaPrezzo.stato).toBe("da_quotare");
    expect(senzaPrezzo.avvisi.map((a) => a.codice)).toContain("RIGA_LIBERA");

    const conPrezzo = await valutaRiga({ quantita: 3 }, ds, {
      prezzoForzato: 145,
    });
    expect(conPrezzo.stato).toBe("manuale");
    expect(conPrezzo.totale).toBe(435);
    expect(conPrezzo.avvisi.map((a) => a.codice)).toEqual(["RIGA_LIBERA"]);
  });

  it("quota una riga a listino fisso senza avvisi", async () => {
    const riga = await valutaRiga({ sellProductId: 3, quantita: 1 }, ds);
    expect(riga.stato).toBe("quotata");
    expect(riga.prezzoUnitario).toBe(600);
    expect(riga.avvisi).toHaveLength(0);
  });
});

describe("riepilogaAvvisi", () => {
  it("conta le severita e le posizioni bloccanti", async () => {
    const ds = makeDataSource();
    const righe: RigaValutata[] = [
      await valutaRiga(
        { sellProductId: 1, larghezzaMm: 1400, altezzaMm: 1600, quantita: 3 },
        ds,
      ),
      await valutaRiga(
        { sellProductId: 2, larghezzaMm: 3000, altezzaMm: 2400, quantita: 1 },
        ds,
      ),
      await valutaRiga({ sellProductId: 3, quantita: 1 }, ds),
    ];

    const riepilogo = riepilogaAvvisi(righe);
    expect(riepilogo.bloccanti).toBe(1);
    expect(riepilogo.alta).toBe(1);
    expect(riepilogo.media).toBeGreaterThanOrEqual(1);
  });
});
