import {
  calcolaPrezzo,
  type ListinoDataSource,
  type ProdottoListino,
} from "@/lib/listino/calcola-prezzo";
import { buildCatalogRiga } from "@/lib/listino/build-riga";
import { calcolaTotaliDocumento } from "@/lib/documenti/calcolo-totali";
import type { CoefficienteCategoria, Supplemento } from "@/types/supabase";
import {
  DocumentoArricchitoSchema,
  RigaArricchitaSchema,
} from "@/validation/documenti/extracted-document";

// ---------------------------------------------------------------------------
// Fase 6 - Test integrazione end-to-end del flusso Offerta:
// configuratore catalogo (una modalita per categoria) -> RigaArricchita ->
// validazione schema documento -> calcolo totali, con regressione riga a
// testo libero. Le tabelle reali sono vuote: si usano dati di test plausibili.
// ---------------------------------------------------------------------------

const PRODOTTI: Record<number, ProdottoListino> = {
  // Serramento a griglia con materiale + vetro (coefficienti applicati)
  101: {
    id: 101,
    modalita_prezzo: "griglia",
    famiglia_apertura_cod: "FIN_SING",
    cod_materiale: "ALU",
    cod_vetro_telaio: "VC2",
  },
  // Porta a misure standard
  102: { id: 102, modalita_prezzo: "misure_standard", famiglia_apertura_cod: null },
  // Accessorio a prezzo fisso
  103: { id: 103, modalita_prezzo: "fisso", famiglia_apertura_cod: null },
};

const GRIGLIA = [
  { famiglia: "FIN_SING", wMax: 1000, hMax: 1500, prezzo: 500 },
];

const MISURE_STANDARD: Record<number, Record<string, number>> = {
  102: { "900x2100": 650 },
};

const FISSO: Record<number, number> = { 103: 300 };

const COEFFICIENTI: {
  categoria: CoefficienteCategoria;
  codice: string;
  moltiplicatore: number;
}[] = [
  { categoria: "materiale_serramento", codice: "ALU", moltiplicatore: 1.2 },
  { categoria: "vetro", codice: "VC2", moltiplicatore: 1.1 },
];

const SUPPLEMENTI: Record<string, Supplemento> = {
  SUP1: {
    id: "SUP1",
    site_id: "site-test",
    codice: "POSA",
    nome: "Posa in opera",
    descrizione: null,
    tipo_calcolo: "fisso_chf",
    valore: 50,
    attivo: true,
    created_at: "2026-08-10T00:00:00Z",
    updated_at: "2026-08-10T00:00:00Z",
  },
};

const fakeDataSource: ListinoDataSource = {
  async getProdotto(ref) {
    return ref.sellProductId != null ? PRODOTTI[ref.sellProductId] ?? null : null;
  },
  async getPrezzoGriglia(famiglia, w, h) {
    const cell = GRIGLIA.find(
      (c) => c.famiglia === famiglia && w <= c.wMax && h <= c.hMax,
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
  async getIncrementiDimensionali() {
    return [];
  },
  async getSupplementi(ids) {
    return ids.map((id) => SUPPLEMENTI[id]).filter(Boolean) as Supplemento[];
  },
};

describe("Fase 6 - E2E Offerta da catalogo", () => {
  it("griglia+coefficienti+supplemento -> riga valida", async () => {
    const b = await calcolaPrezzo(
      {
        sellProductId: 101,
        larghezzaMm: 800,
        altezzaMm: 1400,
        codMateriale: "ALU",
        codVetroTelaio: "VC2",
        supplementoIds: ["SUP1"],
        quantita: 2,
      },
      fakeDataSource,
    );
    // 500 * 1.2 * 1.1 = 660, + 50 (fisso) = 710
    expect(b.prezzoBase).toBe(500);
    expect(b.coefficienti).toHaveLength(2);
    expect(b.prezzoUnitario).toBe(710);
    expect(b.totale).toBe(1420);

    const riga = buildCatalogRiga({
      productId: 101,
      productName: "Finestra alluminio",
      modalita: "griglia",
      larghezzaMm: 800,
      altezzaMm: 1400,
      codMateriale: "ALU",
      codVetroTelaio: "VC2",
      supplementiNomi: ["Posa in opera"],
      quantita: 2,
      prezzoUnitario: b.prezzoUnitario,
    });

    const parsed = RigaArricchitaSchema.safeParse(riga);
    expect(parsed.success).toBe(true);
    expect(riga.misure).toBe("800x1400 mm");
    expect(riga.descrizioneEstesa).toContain("Misure: 800x1400 mm");
    expect(riga.descrizioneEstesa).toContain("Materiale: ALU");
    expect(riga.descrizioneEstesa).toContain("Posa in opera");
    expect(riga.articoloId).toBe(101);
    expect(riga.isNuovo).toBe(false);
  });

  it("le 3 modalita + riga testo libero producono un documento valido con totali corretti", async () => {
    const bGriglia = await calcolaPrezzo(
      {
        sellProductId: 101,
        larghezzaMm: 800,
        altezzaMm: 1400,
        codMateriale: "ALU",
        codVetroTelaio: "VC2",
        supplementoIds: ["SUP1"],
        quantita: 2,
      },
      fakeDataSource,
    );
    const bMisure = await calcolaPrezzo(
      { sellProductId: 102, larghezzaMm: 900, altezzaMm: 2100 },
      fakeDataSource,
    );
    const bFisso = await calcolaPrezzo({ sellProductId: 103 }, fakeDataSource);

    const rigaGriglia = buildCatalogRiga({
      productId: 101,
      productName: "Finestra alluminio",
      modalita: "griglia",
      larghezzaMm: 800,
      altezzaMm: 1400,
      codMateriale: "ALU",
      codVetroTelaio: "VC2",
      supplementiNomi: ["Posa in opera"],
      quantita: 2,
      prezzoUnitario: bGriglia.prezzoUnitario,
    });
    const rigaMisure = buildCatalogRiga({
      productId: 102,
      productName: "Porta interna",
      modalita: "misure_standard",
      larghezzaMm: 900,
      altezzaMm: 2100,
      quantita: 1,
      prezzoUnitario: bMisure.prezzoUnitario,
    });
    const rigaFisso = buildCatalogRiga({
      productId: 103,
      productName: "Kit accessori",
      modalita: "fisso",
      quantita: 1,
      prezzoUnitario: bFisso.prezzoUnitario,
    });

    // Regressione: riga a testo libero (manuale, non da catalogo)
    const rigaLibera = {
      descrizione: "Consulenza in cantiere",
      descrizioneEstesa: null,
      misure: null,
      unita: "h" as const,
      quantita: 4,
      prezzoUnitario: 90,
      sconto: null,
      isTrasporto: false,
      articoloId: null,
      isNuovo: true,
    };

    const documento = {
      tipoDocumento: "OFFERTA" as const,
      destinatario: {
        ragioneSociale: "Cliente Test SA",
        aca: null,
        via: null,
        cap: null,
        citta: null,
        clienteId: null,
        isNuovo: true,
      },
      oggetto: "Fornitura serramenti",
      righe: [rigaGriglia, rigaMisure, rigaFisso, rigaLibera],
      condizioniPagamento: ["30 giorni"],
      termineFornitura: null,
      note: null,
    };

    const parsed = DocumentoArricchitoSchema.safeParse(documento);
    expect(parsed.success).toBe(true);

    // La riga libera resta un valido cittadino della pipeline
    expect(rigaLibera.articoloId).toBeNull();
    expect(rigaLibera.isNuovo).toBe(true);

    // Totali: 1420 + 650 + 300 + 360 = 2730 netto
    const totali = calcolaTotaliDocumento(documento.righe, "OFFERTA");
    expect(totali.totNetto).toBe(2730);
    expect(totali.iva).toBe(221.13);
    expect(totali.totaleCHF).toBe(2951.13);
  });
});
