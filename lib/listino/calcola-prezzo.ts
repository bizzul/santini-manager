import { roundCurrency } from "@/lib/documenti/calcolo-totali";
import type {
  CoefficienteCategoria,
  DimensioneIncremento,
  ListinoIncrementoDimensionale,
  ModalitaPrezzo,
  Supplemento,
  SupplementoTipoCalcolo,
} from "@/types/supabase";

// ---------------------------------------------------------------------------
// Fase 3 — Motore di calcolo prezzo listino
//
// La logica di calcolo e' separata dall'accesso ai dati tramite l'interfaccia
// ListinoDataSource, cosi' il motore e' testabile con un data source in-memory
// e in produzione usa l'implementazione Supabase (supabase-data-source.ts).
//
// Formula (dal piano operativo):
//   prezzo = base(griglia | misura_standard | fisso | mq)
//            x coeff_materiale x coeff_vetro_o_telaio
//            + Sigma supplementi fissi/per_mq/per_metro_lineare
//            poi x (1 + Sigma supplementi percentuali)
//
// Regola d'oro: mai un prezzo a zero silenzioso. Se manca la fascia/misura/
// prezzo fisso viene lanciato un ListinoPricingError con codice esplicito.
// ---------------------------------------------------------------------------

export type ListinoPricingErrorCode =
  | "PRODOTTO_NON_TROVATO"
  | "MODALITA_NON_DEFINITA"
  | "FAMIGLIA_APERTURA_MANCANTE"
  | "MISURE_MANCANTI"
  | "FASCIA_NON_TROVATA"
  | "MISURA_NON_TROVATA"
  | "PREZZO_FISSO_NON_TROVATO"
  | "PREZZO_MQ_NON_TROVATO"
  | "PREZZO_MC_NON_TROVATO"
  | "SUPPLEMENTO_NON_TROVATO"
  | "SUPPLEMENTO_NON_ATTIVO"
  | "SUPPLEMENTO_MISURE_MANCANTI";

export class ListinoPricingError extends Error {
  code: ListinoPricingErrorCode;

  constructor(code: ListinoPricingErrorCode, message: string) {
    super(message);
    this.name = "ListinoPricingError";
    this.code = code;
  }
}

export interface ProdottoListino {
  id: number;
  modalita_prezzo: ModalitaPrezzo | null;
  famiglia_apertura_cod: string | null;
  cod_materiale?: string | null;
  cod_vetro_telaio?: string | null;
  cod_tipo_cassone?: string | null;
}

/**
 * Astrazione sull'accesso ai dati di listino. In test viene mockata; in
 * produzione la implementa {@link createSupabaseListinoDataSource}.
 * Tutte le query sono gia' implicitamente scoping-ate per site_id
 * dall'implementazione concreta.
 */
export interface ListinoDataSource {
  getProdotto(ref: {
    sellProductId?: number;
    internalCode?: string;
  }): Promise<ProdottoListino | null>;

  /** Prezzo base della cella di griglia che contiene (larghezza, altezza). */
  getPrezzoGriglia(
    famigliaAperturaCod: string,
    larghezzaMm: number,
    altezzaMm: number,
  ): Promise<number | null>;

  /** Prezzo per il match esatto di misura standard del prodotto. */
  getPrezzoMisuraStandard(
    sellProductId: number,
    larghezzaMm: number,
    altezzaMm: number,
  ): Promise<number | null>;

  /** Prezzo fisso del prodotto. Per la modalita 'mq' e' il prezzo al mq. */
  getPrezzoFisso(sellProductId: number): Promise<number | null>;

  /** Moltiplicatore del primo coefficiente attivo che matcha (categorie, codice). */
  getCoefficiente(
    categorie: CoefficienteCategoria[],
    codice: string,
  ): Promise<number | null>;

  /** Righe di incremento dimensionale attive per una famiglia prodotto. */
  getIncrementiDimensionali(
    famigliaProdottoCod: string,
  ): Promise<ListinoIncrementoDimensionale[]>;

  /** Supplementi corrispondenti agli id passati (anche non attivi). */
  getSupplementi(ids: string[]): Promise<Supplemento[]>;
}

export interface PricingInput {
  sellProductId?: number;
  internalCode?: string;
  larghezzaMm?: number;
  altezzaMm?: number;
  /** Profondita in mm, usata dalla modalita 'mc' (volume). */
  profonditaMm?: number;
  codMateriale?: string | null;
  codVetroTelaio?: string | null;
  /** Codice esecuzione ante (Armadi): scelto in offerta. */
  codEsecuzioneAnte?: string | null;
  /** Codice tipo cassone (Armadi): normalmente dal prodotto. */
  codTipoCassone?: string | null;
  supplementoIds?: string[];
  /** Quantita di righe. Default 1. */
  quantita?: number;
}

export interface CoefficienteApplicato {
  categoria:
    | CoefficienteCategoria
    | "materiale"
    | "vetro_telaio"
    | "esecuzione_ante"
    | "tipo_cassone";
  codice: string;
  moltiplicatore: number;
}

export interface IncrementoApplicato {
  dimensione: DimensioneIncremento;
  valoreMm: number;
  valoreRiferimentoMm: number;
  incrementoMm: number;
  prezzoPerIncrementoChf: number;
  importo: number;
}

export interface SupplementoApplicato {
  id: string;
  codice: string;
  nome: string;
  tipo_calcolo: SupplementoTipoCalcolo;
  valore: number;
  /** Contributo in CHF (per i fissi) o delta CHF applicato (per le percentuali). */
  importo: number;
}

export interface PriceBreakdown {
  modalitaPrezzo: ModalitaPrezzo;
  prezzoBase: number;
  /** Incrementi dimensionali additivi applicati alla base. */
  incrementiDimensionali: IncrementoApplicato[];
  /** prezzoBase + somma incrementi dimensionali. */
  prezzoBaseConIncrementi: number;
  coefficienti: CoefficienteApplicato[];
  prezzoDopoCoefficienti: number;
  supplementiFissi: SupplementoApplicato[];
  supplementiPercentuali: SupplementoApplicato[];
  /** Prezzo unitario finale (una riga). */
  prezzoUnitario: number;
  quantita: number;
  /** prezzoUnitario x quantita. */
  totale: number;
}

function areaMq(larghezzaMm: number, altezzaMm: number): number {
  return (larghezzaMm / 1000) * (altezzaMm / 1000);
}

function perimetroM(larghezzaMm: number, altezzaMm: number): number {
  return (2 * (larghezzaMm + altezzaMm)) / 1000;
}

function hasMisure(input: PricingInput): input is PricingInput & {
  larghezzaMm: number;
  altezzaMm: number;
} {
  return (
    typeof input.larghezzaMm === "number" &&
    input.larghezzaMm > 0 &&
    typeof input.altezzaMm === "number" &&
    input.altezzaMm > 0
  );
}

async function risolviPrezzoBase(
  prodotto: ProdottoListino,
  modalita: ModalitaPrezzo,
  input: PricingInput,
  dataSource: ListinoDataSource,
): Promise<number> {
  switch (modalita) {
    case "griglia": {
      if (!prodotto.famiglia_apertura_cod) {
        throw new ListinoPricingError(
          "FAMIGLIA_APERTURA_MANCANTE",
          `Il prodotto ${prodotto.id} e' a griglia ma non ha famiglia_apertura_cod.`,
        );
      }
      if (!hasMisure(input)) {
        throw new ListinoPricingError(
          "MISURE_MANCANTI",
          "Larghezza e altezza (mm) sono obbligatorie per un prodotto a griglia.",
        );
      }
      const prezzo = await dataSource.getPrezzoGriglia(
        prodotto.famiglia_apertura_cod,
        input.larghezzaMm,
        input.altezzaMm,
      );
      if (prezzo == null) {
        throw new ListinoPricingError(
          "FASCIA_NON_TROVATA",
          `Nessuna fascia in listino_griglia_base per ${prodotto.famiglia_apertura_cod} a ${input.larghezzaMm}x${input.altezzaMm} mm.`,
        );
      }
      return prezzo;
    }
    case "misure_standard": {
      if (!hasMisure(input)) {
        throw new ListinoPricingError(
          "MISURE_MANCANTI",
          "Larghezza e altezza (mm) sono obbligatorie per una misura standard.",
        );
      }
      const prezzo = await dataSource.getPrezzoMisuraStandard(
        prodotto.id,
        input.larghezzaMm,
        input.altezzaMm,
      );
      if (prezzo == null) {
        throw new ListinoPricingError(
          "MISURA_NON_TROVATA",
          `Nessuna misura standard per il prodotto ${prodotto.id} a ${input.larghezzaMm}x${input.altezzaMm} mm.`,
        );
      }
      return prezzo;
    }
    case "fisso": {
      const prezzo = await dataSource.getPrezzoFisso(prodotto.id);
      if (prezzo == null) {
        throw new ListinoPricingError(
          "PREZZO_FISSO_NON_TROVATO",
          `Nessun prezzo fisso in listino_fisso per il prodotto ${prodotto.id}.`,
        );
      }
      return prezzo;
    }
    case "mq": {
      if (!hasMisure(input)) {
        throw new ListinoPricingError(
          "MISURE_MANCANTI",
          "Larghezza e altezza (mm) sono obbligatorie per il prezzo al mq.",
        );
      }
      // Per la modalita 'mq' il prezzo al metro quadro e' memorizzato in
      // listino_fisso.prezzo_chf (CHF/mq) e viene moltiplicato per l'area.
      const prezzoAlMq = await dataSource.getPrezzoFisso(prodotto.id);
      if (prezzoAlMq == null) {
        throw new ListinoPricingError(
          "PREZZO_MQ_NON_TROVATO",
          `Nessun prezzo al mq (listino_fisso) per il prodotto ${prodotto.id}.`,
        );
      }
      return prezzoAlMq * areaMq(input.larghezzaMm, input.altezzaMm);
    }
    case "mc": {
      if (!hasMisure(input)) {
        throw new ListinoPricingError(
          "MISURE_MANCANTI",
          "Larghezza e altezza (mm) sono obbligatorie per il prezzo a volume.",
        );
      }
      // La tariffa e' in listino_fisso.prezzo_chf. Se la profondita e'
      // presente si calcola a volume (CHF/mc x m3), altrimenti si ripiega
      // sul calcolo a superficie (mq), come da scelta di modello.
      const tariffa = await dataSource.getPrezzoFisso(prodotto.id);
      if (tariffa == null) {
        throw new ListinoPricingError(
          "PREZZO_MC_NON_TROVATO",
          `Nessuna tariffa (listino_fisso) per il prodotto a volume ${prodotto.id}.`,
        );
      }
      const area = areaMq(input.larghezzaMm, input.altezzaMm);
      const haProfondita =
        typeof input.profonditaMm === "number" && input.profonditaMm > 0;
      return haProfondita
        ? tariffa * area * (input.profonditaMm! / 1000)
        : tariffa * area;
    }
    default: {
      const _exhaustive: never = modalita;
      throw new ListinoPricingError(
        "MODALITA_NON_DEFINITA",
        `Modalita prezzo non gestita: ${String(_exhaustive)}.`,
      );
    }
  }
}

/** Mappa una dimensione di incremento al valore in input (mm). */
function valorePerDimensione(
  dimensione: DimensioneIncremento,
  input: PricingInput,
): number | null {
  switch (dimensione) {
    case "larghezza":
      return typeof input.larghezzaMm === "number" ? input.larghezzaMm : null;
    case "altezza":
      return typeof input.altezzaMm === "number" ? input.altezzaMm : null;
    case "profondita":
      return typeof input.profonditaMm === "number" ? input.profonditaMm : null;
    default:
      return null;
  }
}

/**
 * Termine additivo di prezzo per scostamento dimensionale. Si somma alla base
 * PRIMA dei coefficienti moltiplicativi. Gli scostamenti negativi (misura sotto
 * il valore di riferimento) sono limitati a 0: nessuno sconto sotto il riferimento.
 */
async function risolviIncrementiDimensionali(
  prodotto: ProdottoListino,
  input: PricingInput,
  dataSource: ListinoDataSource,
): Promise<IncrementoApplicato[]> {
  const famiglia = prodotto.famiglia_apertura_cod;
  if (!famiglia) return [];

  const righe = await dataSource.getIncrementiDimensionali(famiglia);
  if (!righe || righe.length === 0) return [];

  const applicati: IncrementoApplicato[] = [];
  for (const riga of righe) {
    if (!riga.attivo) continue;
    const valoreMm = valorePerDimensione(riga.dimensione, input);
    if (valoreMm == null || riga.incremento_mm <= 0) continue;

    const rawSteps =
      (valoreMm - riga.valore_riferimento_mm) / riga.incremento_mm;
    const steps = Math.max(0, rawSteps);
    const importo = roundCurrency(steps * Number(riga.prezzo_per_incremento_chf));
    if (importo === 0) continue;

    applicati.push({
      dimensione: riga.dimensione,
      valoreMm,
      valoreRiferimentoMm: riga.valore_riferimento_mm,
      incrementoMm: riga.incremento_mm,
      prezzoPerIncrementoChf: Number(riga.prezzo_per_incremento_chf),
      importo,
    });
  }
  return applicati;
}

async function risolviCoefficienti(
  prodotto: ProdottoListino,
  input: PricingInput,
  dataSource: ListinoDataSource,
): Promise<CoefficienteApplicato[]> {
  const applicati: CoefficienteApplicato[] = [];

  const codMateriale = input.codMateriale ?? prodotto.cod_materiale ?? null;
  if (codMateriale) {
    const moltiplicatore = await dataSource.getCoefficiente(
      ["materiale_serramento", "materiale_porta", "materiale_arredamento"],
      codMateriale,
    );
    if (moltiplicatore != null) {
      applicati.push({
        categoria: "materiale",
        codice: codMateriale,
        moltiplicatore,
      });
    }
  }

  const codVetroTelaio =
    input.codVetroTelaio ?? prodotto.cod_vetro_telaio ?? null;
  if (codVetroTelaio) {
    const moltiplicatore = await dataSource.getCoefficiente(
      ["vetro", "telaio"],
      codVetroTelaio,
    );
    if (moltiplicatore != null) {
      applicati.push({
        categoria: "vetro_telaio",
        codice: codVetroTelaio,
        moltiplicatore,
      });
    }
  }

  // Esecuzione ante (Armadi): scelta in offerta, si applica solo alle ante.
  const codEsecuzioneAnte = input.codEsecuzioneAnte ?? null;
  if (codEsecuzioneAnte) {
    const moltiplicatore = await dataSource.getCoefficiente(
      ["esecuzione_ante"],
      codEsecuzioneAnte,
    );
    if (moltiplicatore != null) {
      applicati.push({
        categoria: "esecuzione_ante",
        codice: codEsecuzioneAnte,
        moltiplicatore,
      });
    }
  }

  // Tipo cassone (Armadi): normalmente attributo fisso del prodotto.
  const codTipoCassone =
    input.codTipoCassone ?? prodotto.cod_tipo_cassone ?? null;
  if (codTipoCassone) {
    const moltiplicatore = await dataSource.getCoefficiente(
      ["tipo_cassone"],
      codTipoCassone,
    );
    if (moltiplicatore != null) {
      applicati.push({
        categoria: "tipo_cassone",
        codice: codTipoCassone,
        moltiplicatore,
      });
    }
  }

  return applicati;
}

/**
 * Calcola il prezzo di una riga prodotto configurata, con breakdown completo.
 * @throws {ListinoPricingError} quando manca la base prezzo o un supplemento.
 */
export async function calcolaPrezzo(
  input: PricingInput,
  dataSource: ListinoDataSource,
): Promise<PriceBreakdown> {
  if (input.sellProductId == null && !input.internalCode) {
    throw new ListinoPricingError(
      "PRODOTTO_NON_TROVATO",
      "Specificare sellProductId o internalCode.",
    );
  }

  const prodotto = await dataSource.getProdotto({
    sellProductId: input.sellProductId,
    internalCode: input.internalCode,
  });
  if (!prodotto) {
    throw new ListinoPricingError(
      "PRODOTTO_NON_TROVATO",
      `Prodotto non trovato (${input.sellProductId ?? input.internalCode}).`,
    );
  }

  const modalita = prodotto.modalita_prezzo;
  if (!modalita) {
    throw new ListinoPricingError(
      "MODALITA_NON_DEFINITA",
      `Il prodotto ${prodotto.id} non ha modalita_prezzo definita.`,
    );
  }

  const prezzoBaseRaw = await risolviPrezzoBase(
    prodotto,
    modalita,
    input,
    dataSource,
  );
  const prezzoBase = roundCurrency(prezzoBaseRaw);

  // Termine additivo (incrementi dimensionali) applicato alla base PRIMA dei
  // coefficienti moltiplicativi.
  const incrementiDimensionali = await risolviIncrementiDimensionali(
    prodotto,
    input,
    dataSource,
  );
  const incrementiTotale = incrementiDimensionali.reduce(
    (acc, i) => acc + i.importo,
    0,
  );
  const prezzoBaseConIncrementiRaw = prezzoBaseRaw + incrementiTotale;
  const prezzoBaseConIncrementi = roundCurrency(prezzoBaseConIncrementiRaw);

  const coefficienti = await risolviCoefficienti(prodotto, input, dataSource);
  const prezzoDopoCoefficienti = roundCurrency(
    coefficienti.reduce(
      (acc, c) => acc * c.moltiplicatore,
      prezzoBaseConIncrementiRaw,
    ),
  );

  const supplementiFissi: SupplementoApplicato[] = [];
  const supplementiPercentuali: SupplementoApplicato[] = [];
  let sommaFissi = 0;
  let percentualeTotale = 0;

  const ids = input.supplementoIds ?? [];
  if (ids.length > 0) {
    const supplementi = await dataSource.getSupplementi(ids);
    const byId = new Map(supplementi.map((s) => [s.id, s]));

    for (const id of ids) {
      const supplemento = byId.get(id);
      if (!supplemento) {
        throw new ListinoPricingError(
          "SUPPLEMENTO_NON_TROVATO",
          `Supplemento non trovato: ${id}.`,
        );
      }
      if (!supplemento.attivo) {
        throw new ListinoPricingError(
          "SUPPLEMENTO_NON_ATTIVO",
          `Supplemento non attivo: ${supplemento.codice}.`,
        );
      }

      switch (supplemento.tipo_calcolo) {
        case "fisso_chf": {
          const importo = roundCurrency(supplemento.valore);
          sommaFissi += importo;
          supplementiFissi.push(toApplicato(supplemento, importo));
          break;
        }
        case "per_mq": {
          if (!hasMisure(input)) {
            throw new ListinoPricingError(
              "SUPPLEMENTO_MISURE_MANCANTI",
              `Il supplemento ${supplemento.codice} e' per mq ma mancano le misure.`,
            );
          }
          const importo = roundCurrency(
            supplemento.valore * areaMq(input.larghezzaMm, input.altezzaMm),
          );
          sommaFissi += importo;
          supplementiFissi.push(toApplicato(supplemento, importo));
          break;
        }
        case "per_metro_lineare": {
          if (!hasMisure(input)) {
            throw new ListinoPricingError(
              "SUPPLEMENTO_MISURE_MANCANTI",
              `Il supplemento ${supplemento.codice} e' per metro lineare ma mancano le misure.`,
            );
          }
          const importo = roundCurrency(
            supplemento.valore *
              perimetroM(input.larghezzaMm, input.altezzaMm),
          );
          sommaFissi += importo;
          supplementiFissi.push(toApplicato(supplemento, importo));
          break;
        }
        case "percentuale": {
          percentualeTotale += supplemento.valore;
          // importo calcolato dopo, quando conosciamo il subtotale
          supplementiPercentuali.push(toApplicato(supplemento, 0));
          break;
        }
        default: {
          const _exhaustive: never = supplemento.tipo_calcolo;
          throw new ListinoPricingError(
            "SUPPLEMENTO_NON_TROVATO",
            `Tipo calcolo supplemento non gestito: ${String(_exhaustive)}.`,
          );
        }
      }
    }
  }

  const subtotale = roundCurrency(prezzoDopoCoefficienti + sommaFissi);

  // Ricalcola l'importo effettivo di ogni supplemento percentuale sul subtotale.
  for (const applicato of supplementiPercentuali) {
    applicato.importo = roundCurrency((subtotale * applicato.valore) / 100);
  }

  const prezzoUnitario = roundCurrency(
    subtotale * (1 + percentualeTotale / 100),
  );

  const quantita = input.quantita ?? 1;
  const totale = roundCurrency(prezzoUnitario * quantita);

  return {
    modalitaPrezzo: modalita,
    prezzoBase,
    incrementiDimensionali,
    prezzoBaseConIncrementi,
    coefficienti,
    prezzoDopoCoefficienti,
    supplementiFissi,
    supplementiPercentuali,
    prezzoUnitario,
    quantita,
    totale,
  };
}

function toApplicato(
  supplemento: Supplemento,
  importo: number,
): SupplementoApplicato {
  return {
    id: supplemento.id,
    codice: supplemento.codice,
    nome: supplemento.nome,
    tipo_calcolo: supplemento.tipo_calcolo,
    valore: supplemento.valore,
    importo,
  };
}
