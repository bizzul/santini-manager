import {
  calcolaPrezzo,
  ListinoPricingError,
  type ListinoDataSource,
  type ProdottoListino,
} from "@/lib/listino/calcola-prezzo";
import type {
  CoefficienteCategoria,
  Supplemento,
} from "@/types/supabase";

// ---------------------------------------------------------------------------
// Dati di test plausibili (le tabelle reali sono ancora vuote).
// ---------------------------------------------------------------------------

const PRODOTTI: Record<number, ProdottoListino> = {
  // Finestra a griglia, senza materiale/vetro -> base "pura"
  1: {
    id: 1,
    modalita_prezzo: "griglia",
    famiglia_apertura_cod: "FIN_SING",
    cod_materiale: null,
    cod_vetro_telaio: null,
  },
  // Finestra a griglia con materiale ALU + vetro VC2 -> coefficienti applicati
  2: {
    id: 2,
    modalita_prezzo: "griglia",
    famiglia_apertura_cod: "FIN_SING",
    cod_materiale: "ALU",
    cod_vetro_telaio: "VC2",
  },
  // Porta a misure standard
  3: {
    id: 3,
    modalita_prezzo: "misure_standard",
    famiglia_apertura_cod: null,
  },
  // Accessorio a prezzo fisso
  4: { id: 4, modalita_prezzo: "fisso", famiglia_apertura_cod: null },
  // Pannello a prezzo al mq (rate in listino_fisso)
  5: { id: 5, modalita_prezzo: "mq", famiglia_apertura_cod: null },
  // Prodotto senza modalita definita
  6: { id: 6, modalita_prezzo: null, famiglia_apertura_cod: null },
  // Arredamento a volume (rate in listino_fisso)
  7: { id: 7, modalita_prezzo: "mc", famiglia_apertura_cod: null },
  // Armadio cassone (griglia + incrementi profondita + tipo cassone fisso)
  8: {
    id: 8,
    modalita_prezzo: "griglia",
    famiglia_apertura_cod: "ARM_CASSONE",
    cod_materiale: null,
    cod_vetro_telaio: null,
    cod_tipo_cassone: "ARM_MURO",
  },
};

const INTERNAL_CODES: Record<string, number> = { "FIN-0001": 1 };

interface GrigliaCell {
  famiglia: string;
  wMin: number;
  wMax: number;
  hMin: number;
  hMax: number;
  prezzo: number;
}

const GRIGLIA: GrigliaCell[] = [
  { famiglia: "FIN_SING", wMin: 0, wMax: 1000, hMin: 0, hMax: 1500, prezzo: 500 },
  {
    famiglia: "FIN_SING",
    wMin: 1001,
    wMax: 2000,
    hMin: 0,
    hMax: 1500,
    prezzo: 800,
  },
  {
    famiglia: "ARM_CASSONE",
    wMin: 300,
    wMax: 1200,
    hMin: 1200,
    hMax: 2800,
    prezzo: 1000,
  },
];

interface IncrementoCell {
  famiglia: string;
  dimensione: "larghezza" | "altezza" | "profondita";
  valore_riferimento_mm: number;
  incremento_mm: number;
  prezzo_per_incremento_chf: number;
  attivo: boolean;
}

const INCREMENTI: IncrementoCell[] = [
  {
    famiglia: "ARM_CASSONE",
    dimensione: "profondita",
    valore_riferimento_mm: 300,
    incremento_mm: 50,
    prezzo_per_incremento_chf: 40,
    attivo: true,
  },
];

const MISURE_STANDARD: Record<number, Record<string, number>> = {
  3: { "900x2100": 650 },
};

const FISSO: Record<number, number> = {
  4: 300,
  5: 200, // CHF/mq per la modalita 'mq'
  7: 100, // CHF/mc (o CHF/mq in fallback) per la modalita 'mc'
};

const COEFFICIENTI: {
  categoria: CoefficienteCategoria;
  codice: string;
  moltiplicatore: number;
}[] = [
  { categoria: "materiale_serramento", codice: "ALU", moltiplicatore: 1.2 },
  { categoria: "vetro", codice: "VC2", moltiplicatore: 1.1 },
  { categoria: "esecuzione_ante", codice: "TRC_B", moltiplicatore: 1.0 },
  { categoria: "esecuzione_ante", codice: "MDF_LAC", moltiplicatore: 1.5 },
  { categoria: "tipo_cassone", codice: "ARM_MURO", moltiplicatore: 1.0 },
  { categoria: "tipo_cassone", codice: "ARM_SCORR2", moltiplicatore: 1.2 },
];

function makeSupplemento(
  id: string,
  codice: string,
  tipo_calcolo: Supplemento["tipo_calcolo"],
  valore: number,
  attivo = true,
): Supplemento {
  return {
    id,
    site_id: "site-test",
    codice,
    nome: codice,
    descrizione: null,
    tipo_calcolo,
    valore,
    attivo,
    created_at: "2026-08-10T00:00:00Z",
    updated_at: "2026-08-10T00:00:00Z",
  };
}

const SUPPLEMENTI: Record<string, Supplemento> = {
  S1: makeSupplemento("S1", "FISSO50", "fisso_chf", 50),
  S2: makeSupplemento("S2", "PERC10", "percentuale", 10),
  S3: makeSupplemento("S3", "MQ20", "per_mq", 20),
  S4: makeSupplemento("S4", "ML15", "per_metro_lineare", 15),
  S5: makeSupplemento("S5", "OFF", "fisso_chf", 30, false),
};

const fakeDataSource: ListinoDataSource = {
  async getProdotto(ref) {
    if (ref.sellProductId != null) return PRODOTTI[ref.sellProductId] ?? null;
    if (ref.internalCode) {
      const id = INTERNAL_CODES[ref.internalCode];
      return id ? PRODOTTI[id] : null;
    }
    return null;
  },
  async getPrezzoGriglia(famiglia, w, h) {
    const cell = GRIGLIA.find(
      (c) =>
        c.famiglia === famiglia &&
        w >= c.wMin &&
        w <= c.wMax &&
        h >= c.hMin &&
        h <= c.hMax,
    );
    return cell ? cell.prezzo : null;
  },
  async getPrezzoMisuraStandard(sellProductId, w, h) {
    return MISURE_STANDARD[sellProductId]?.[`${w}x${h}`] ?? null;
  },
  async getPrezzoFisso(sellProductId) {
    return FISSO[sellProductId] ?? null;
  },
  async getCoefficiente(categorie, codice) {
    const match = COEFFICIENTI.find(
      (c) => categorie.includes(c.categoria) && c.codice === codice,
    );
    return match ? match.moltiplicatore : null;
  },
  async getIncrementiDimensionali(famiglia) {
    return INCREMENTI.filter((i) => i.famiglia === famiglia).map((i) => ({
      id: `${i.famiglia}-${i.dimensione}`,
      site_id: "site-test",
      famiglia_prodotto_cod: i.famiglia,
      dimensione: i.dimensione,
      valore_riferimento_mm: i.valore_riferimento_mm,
      incremento_mm: i.incremento_mm,
      prezzo_per_incremento_chf: i.prezzo_per_incremento_chf,
      attivo: i.attivo,
      created_at: "2026-08-10T00:00:00Z",
      updated_at: "2026-08-10T00:00:00Z",
    }));
  },
  async getSupplementi(ids) {
    return ids.map((id) => SUPPLEMENTI[id]).filter(Boolean) as Supplemento[];
  },
};

describe("calcolaPrezzo - modalita base", () => {
  it("griglia: trova la fascia e ritorna il prezzo base", async () => {
    const b = await calcolaPrezzo(
      { sellProductId: 1, larghezzaMm: 800, altezzaMm: 1400 },
      fakeDataSource,
    );
    expect(b.modalitaPrezzo).toBe("griglia");
    expect(b.prezzoBase).toBe(500);
    expect(b.coefficienti).toHaveLength(0);
    expect(b.prezzoUnitario).toBe(500);
    expect(b.totale).toBe(500);
  });

  it("griglia: seleziona la fascia larghezza superiore", async () => {
    const b = await calcolaPrezzo(
      { sellProductId: 1, larghezzaMm: 1500, altezzaMm: 1400 },
      fakeDataSource,
    );
    expect(b.prezzoBase).toBe(800);
  });

  it("misure_standard: match esatto della taglia", async () => {
    const b = await calcolaPrezzo(
      { sellProductId: 3, larghezzaMm: 900, altezzaMm: 2100 },
      fakeDataSource,
    );
    expect(b.modalitaPrezzo).toBe("misure_standard");
    expect(b.prezzoBase).toBe(650);
    expect(b.prezzoUnitario).toBe(650);
  });

  it("fisso: prezzo dal listino_fisso", async () => {
    const b = await calcolaPrezzo({ sellProductId: 4 }, fakeDataSource);
    expect(b.modalitaPrezzo).toBe("fisso");
    expect(b.prezzoBase).toBe(300);
    expect(b.prezzoUnitario).toBe(300);
  });

  it("mq: prezzo al mq x area", async () => {
    // 1000x2000 mm = 2 mq, 200 CHF/mq -> 400
    const b = await calcolaPrezzo(
      { sellProductId: 5, larghezzaMm: 1000, altezzaMm: 2000 },
      fakeDataSource,
    );
    expect(b.modalitaPrezzo).toBe("mq");
    expect(b.prezzoBase).toBe(400);
    expect(b.prezzoUnitario).toBe(400);
  });

  it("mc: prezzo a volume quando c'e' la profondita", async () => {
    // 1000x1000 = 1 mq, profondita 500 mm = 0.5 m -> 0.5 mc x 100 = 50
    const b = await calcolaPrezzo(
      {
        sellProductId: 7,
        larghezzaMm: 1000,
        altezzaMm: 1000,
        profonditaMm: 500,
      },
      fakeDataSource,
    );
    expect(b.modalitaPrezzo).toBe("mc");
    expect(b.prezzoBase).toBe(50);
    expect(b.prezzoUnitario).toBe(50);
  });

  it("mc: ripiega sul calcolo a mq senza profondita", async () => {
    // 1000x1000 = 1 mq x 100 = 100
    const b = await calcolaPrezzo(
      { sellProductId: 7, larghezzaMm: 1000, altezzaMm: 1000 },
      fakeDataSource,
    );
    expect(b.prezzoBase).toBe(100);
    expect(b.prezzoUnitario).toBe(100);
  });

  it("risolve il prodotto anche per internal_code", async () => {
    const b = await calcolaPrezzo(
      { internalCode: "FIN-0001", larghezzaMm: 800, altezzaMm: 1400 },
      fakeDataSource,
    );
    expect(b.prezzoBase).toBe(500);
  });
});

describe("calcolaPrezzo - coefficienti", () => {
  it("applica coeff materiale e vetro dal prodotto", async () => {
    // 500 x 1.2 (ALU) x 1.1 (VC2) = 660
    const b = await calcolaPrezzo(
      { sellProductId: 2, larghezzaMm: 800, altezzaMm: 1400 },
      fakeDataSource,
    );
    expect(b.prezzoDopoCoefficienti).toBe(660);
    expect(b.prezzoUnitario).toBe(660);
    expect(b.coefficienti).toEqual([
      { categoria: "materiale", codice: "ALU", moltiplicatore: 1.2 },
      { categoria: "vetro_telaio", codice: "VC2", moltiplicatore: 1.1 },
    ]);
  });

  it("override dei codici materiale/vetro dall'input", async () => {
    // Codici non presenti nei coefficienti -> default 1.0
    const b = await calcolaPrezzo(
      {
        sellProductId: 2,
        larghezzaMm: 800,
        altezzaMm: 1400,
        codMateriale: "SCONOSCIUTO",
        codVetroTelaio: "SCONOSCIUTO",
      },
      fakeDataSource,
    );
    expect(b.coefficienti).toHaveLength(0);
    expect(b.prezzoUnitario).toBe(500);
  });
});

describe("calcolaPrezzo - supplementi", () => {
  it("supplemento fisso poi percentuale nell'ordine corretto", async () => {
    // base 500 + 50 = 550, poi x1.10 = 605
    const b = await calcolaPrezzo(
      {
        sellProductId: 1,
        larghezzaMm: 800,
        altezzaMm: 1400,
        supplementoIds: ["S1", "S2"],
      },
      fakeDataSource,
    );
    expect(b.supplementiFissi.map((s) => s.importo)).toEqual([50]);
    expect(b.supplementiPercentuali[0].importo).toBe(55); // 550 x 10%
    expect(b.prezzoUnitario).toBe(605);
  });

  it("supplemento per_mq usa l'area", async () => {
    // 1000x1000 mm = 1 mq x 20 = 20 -> base 500 + 20 = 520
    const b = await calcolaPrezzo(
      {
        sellProductId: 1,
        larghezzaMm: 1000,
        altezzaMm: 1000,
        supplementoIds: ["S3"],
      },
      fakeDataSource,
    );
    expect(b.prezzoBase).toBe(500);
    expect(b.supplementiFissi[0].importo).toBe(20);
    expect(b.prezzoUnitario).toBe(520);
  });

  it("supplemento per_metro_lineare usa il perimetro", async () => {
    // perimetro 1000x1000 = 2*(2000)/1000 = 4 m x 15 = 60 -> base 500 + 60 = 560
    const b = await calcolaPrezzo(
      {
        sellProductId: 1,
        larghezzaMm: 1000,
        altezzaMm: 1000,
        supplementoIds: ["S4"],
      },
      fakeDataSource,
    );
    expect(b.supplementiFissi[0].importo).toBe(60);
    expect(b.prezzoUnitario).toBe(560);
  });

  it("moltiplica per quantita", async () => {
    const b = await calcolaPrezzo(
      { sellProductId: 4, quantita: 3 },
      fakeDataSource,
    );
    expect(b.prezzoUnitario).toBe(300);
    expect(b.totale).toBe(900);
  });
});

describe("calcolaPrezzo - errori (mai prezzo a zero)", () => {
  it("lancia FASCIA_NON_TROVATA se nessuna cella copre le misure", async () => {
    await expect(
      calcolaPrezzo(
        { sellProductId: 1, larghezzaMm: 5000, altezzaMm: 5000 },
        fakeDataSource,
      ),
    ).rejects.toMatchObject({
      name: "ListinoPricingError",
      code: "FASCIA_NON_TROVATA",
    });
  });

  it("lancia MISURE_MANCANTI per griglia senza misure", async () => {
    await expect(
      calcolaPrezzo({ sellProductId: 1 }, fakeDataSource),
    ).rejects.toMatchObject({ code: "MISURE_MANCANTI" });
  });

  it("lancia MISURA_NON_TROVATA se la taglia non esiste", async () => {
    await expect(
      calcolaPrezzo(
        { sellProductId: 3, larghezzaMm: 800, altezzaMm: 2000 },
        fakeDataSource,
      ),
    ).rejects.toMatchObject({ code: "MISURA_NON_TROVATA" });
  });

  it("lancia PRODOTTO_NON_TROVATO per id inesistente", async () => {
    await expect(
      calcolaPrezzo({ sellProductId: 999 }, fakeDataSource),
    ).rejects.toBeInstanceOf(ListinoPricingError);
  });

  it("lancia MODALITA_NON_DEFINITA se il prodotto non ha modalita", async () => {
    await expect(
      calcolaPrezzo({ sellProductId: 6 }, fakeDataSource),
    ).rejects.toMatchObject({ code: "MODALITA_NON_DEFINITA" });
  });

  it("lancia SUPPLEMENTO_NON_ATTIVO per un supplemento disattivato", async () => {
    await expect(
      calcolaPrezzo(
        {
          sellProductId: 4,
          supplementoIds: ["S5"],
        },
        fakeDataSource,
      ),
    ).rejects.toMatchObject({ code: "SUPPLEMENTO_NON_ATTIVO" });
  });

  it("lancia SUPPLEMENTO_NON_TROVATO per id inesistente", async () => {
    await expect(
      calcolaPrezzo(
        { sellProductId: 4, supplementoIds: ["NOPE"] },
        fakeDataSource,
      ),
    ).rejects.toMatchObject({ code: "SUPPLEMENTO_NON_TROVATO" });
  });
});

describe("calcolaPrezzo - Armadi cassone (incrementi + coefficienti)", () => {
  it("somma l'extra profondita alla base PRIMA dei coefficienti", async () => {
    // base griglia 1000 + extra profondita (500-300)/50*40 = 160 -> 1160
    // coeff tipo_cassone ARM_MURO x1.0 -> 1160
    const b = await calcolaPrezzo(
      {
        sellProductId: 8,
        larghezzaMm: 600,
        altezzaMm: 2000,
        profonditaMm: 500,
      },
      fakeDataSource,
    );
    expect(b.prezzoBase).toBe(1000);
    expect(b.incrementiDimensionali).toHaveLength(1);
    expect(b.incrementiDimensionali[0].importo).toBe(160);
    expect(b.prezzoBaseConIncrementi).toBe(1160);
    expect(b.prezzoUnitario).toBe(1160);
  });

  it("applica esecuzione_ante e tipo_cassone come moltiplicatori sulla base+extra", async () => {
    // (1000 + 160) x esecuzione MDF_LAC 1.5 x tipo ARM_MURO 1.0 = 1740
    const b = await calcolaPrezzo(
      {
        sellProductId: 8,
        larghezzaMm: 600,
        altezzaMm: 2000,
        profonditaMm: 500,
        codEsecuzioneAnte: "MDF_LAC",
      },
      fakeDataSource,
    );
    expect(b.coefficienti.map((c) => c.categoria)).toEqual([
      "esecuzione_ante",
      "tipo_cassone",
    ]);
    expect(b.prezzoUnitario).toBe(1740);
  });

  it("profondita sotto il riferimento: nessun extra negativo (limitato a 0)", async () => {
    const b = await calcolaPrezzo(
      {
        sellProductId: 8,
        larghezzaMm: 600,
        altezzaMm: 2000,
        profonditaMm: 250,
      },
      fakeDataSource,
    );
    expect(b.incrementiDimensionali).toHaveLength(0);
    expect(b.prezzoBaseConIncrementi).toBe(1000);
    expect(b.prezzoUnitario).toBe(1000);
  });
});
