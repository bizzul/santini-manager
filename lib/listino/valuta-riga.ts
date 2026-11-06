import { roundCurrency } from "@/lib/documenti/calcolo-totali";
import {
  calcolaPrezzo,
  ListinoPricingError,
  type ListinoDataSource,
  type ListinoPricingErrorCode,
  type PriceBreakdown,
  type PricingInput,
} from "@/lib/listino/calcola-prezzo";

// ---------------------------------------------------------------------------
// Valutazione di una riga d'offerta.
//
// calcolaPrezzo() e' volutamente severo: se manca la fascia, la misura o il
// prezzo fisso lancia. Va bene per un'API, non per una schermata d'offerta con
// dieci posizioni, dove la prima eccezione fermerebbe tutte le altre.
//
// Questo strato non cambia il motore: lo avvolge. Ogni riga torna sempre
// valutata, con uno stato esplicito e una lista di avvisi da mostrare accanto
// alla posizione.
//
// Regola invariata: una riga che il motore non sa quotare esce a ZERO con
// stato "da_quotare". Non viene mai inventato un prezzo.
// ---------------------------------------------------------------------------

export type AvvisoSeverita = "alta" | "media" | "bassa";

export type AvvisoCodice =
  | "PREZZO_NON_DISPONIBILE"
  | "FUORI_GRIGLIA"
  | "MISURE_MANCANTI"
  | "COEFFICIENTE_NON_TARATO"
  | "RIGA_LIBERA"
  | "PREZZO_FORZATO";

export interface AvvisoRiga {
  codice: AvvisoCodice;
  severita: AvvisoSeverita;
  messaggio: string;
}

export type StatoRiga = "quotata" | "manuale" | "da_quotare";

export interface RigaValutata {
  /**
   * quotata   = prezzo dal motore
   * manuale   = prezzo forzato dall'utente
   * da_quotare= il motore non sa quotarla, prezzo a zero
   */
  stato: StatoRiga;
  prezzoUnitario: number;
  quantita: number;
  totale: number;
  /** Catena di calcolo. Null su riga manuale o non quotabile. */
  breakdown: PriceBreakdown | null;
  /** Codice dell'errore del motore, se c'e' stato. */
  codiceErrore: ListinoPricingErrorCode | null;
  avvisi: AvvisoRiga[];
}

export interface ValutaRigaOpzioni {
  /** Prezzo unitario imposto a mano. Se presente vince sul listino. */
  prezzoForzato?: number | null;
  /**
   * Scostamento oltre il quale un prezzo forzato genera un avviso,
   * confrontato con quello che avrebbe calcolato il motore. Default 0.10.
   */
  sogliaScostamento?: number;
}

const MESSAGGI_ERRORE: Partial<
  Record<ListinoPricingErrorCode, { codice: AvvisoCodice; messaggio: string }>
> = {
  FASCIA_NON_TROVATA: {
    codice: "FUORI_GRIGLIA",
    messaggio:
      "Misura fuori dalle fasce di griglia, oppure griglia non attiva per questa famiglia. Esecuzione speciale: verificare il prezzo prima dell'invio.",
  },
  MISURA_NON_TROVATA: {
    codice: "PREZZO_NON_DISPONIBILE",
    messaggio:
      "Nessuna misura standard a listino per questa combinazione. Posizione da quotare manualmente.",
  },
  MISURE_MANCANTI: {
    codice: "MISURE_MANCANTI",
    messaggio:
      "Larghezza e altezza sono obbligatorie per calcolare il prezzo di questa posizione.",
  },
  SUPPLEMENTO_MISURE_MANCANTI: {
    codice: "MISURE_MANCANTI",
    messaggio:
      "Un supplemento selezionato si calcola sulle misure, che non sono state inserite.",
  },
  PREZZO_FISSO_NON_TROVATO: {
    codice: "PREZZO_NON_DISPONIBILE",
    messaggio:
      "Prodotto senza prezzo nel listino fisso. Posizione da quotare manualmente.",
  },
  PREZZO_MQ_NON_TROVATO: {
    codice: "PREZZO_NON_DISPONIBILE",
    messaggio:
      "Prodotto senza tariffa al metro quadro. Posizione da quotare manualmente.",
  },
  PREZZO_MC_NON_TROVATO: {
    codice: "PREZZO_NON_DISPONIBILE",
    messaggio:
      "Prodotto senza tariffa a volume. Posizione da quotare manualmente.",
  },
  MODALITA_NON_DEFINITA: {
    codice: "PREZZO_NON_DISPONIBILE",
    messaggio:
      "Il prodotto non ha una modalita di prezzo definita a catalogo. Posizione da quotare manualmente.",
  },
  FAMIGLIA_APERTURA_MANCANTE: {
    codice: "PREZZO_NON_DISPONIBILE",
    messaggio:
      "Il prodotto e' a griglia ma non ha una famiglia di apertura assegnata a catalogo.",
  },
  PRODOTTO_NON_TROVATO: {
    codice: "PREZZO_NON_DISPONIBILE",
    messaggio: "Prodotto non trovato a catalogo per questo spazio.",
  },
};

function avvisoDaErrore(code: ListinoPricingErrorCode): AvvisoRiga {
  const mappato = MESSAGGI_ERRORE[code];
  return {
    codice: mappato?.codice ?? "PREZZO_NON_DISPONIBILE",
    severita: "alta",
    messaggio:
      mappato?.messaggio ??
      "Il motore non ha potuto calcolare un prezzo per questa posizione.",
  };
}

/**
 * Un coefficiente lasciato a 1.0000 e' un placeholder non ancora tarato: il
 * prezzo esce comunque, ma l'attributo che l'utente ha scelto (materiale,
 * vetro, telaio) non sta incidendo. Va detto, o passa inosservato.
 */
function avvisiCoefficientiNonTarati(breakdown: PriceBreakdown): AvvisoRiga[] {
  return breakdown.coefficienti
    .filter((c) => Number(c.moltiplicatore) === 1)
    .map((c) => ({
      codice: "COEFFICIENTE_NON_TARATO" as const,
      severita: "media" as const,
      messaggio: `Coefficiente ${c.categoria} "${c.codice}" ancora a 1.00: non e' stato tarato e non incide sul prezzo.`,
    }));
}

function haRiferimentoProdotto(input: PricingInput): boolean {
  return input.sellProductId != null || Boolean(input.internalCode);
}

function prezzoForzatoValido(valore: number | null | undefined): valore is number {
  return typeof valore === "number" && Number.isFinite(valore) && valore > 0;
}

/**
 * Valuta una riga d'offerta senza mai lanciare. Da usare in tutte le
 * schermate che mostrano piu' posizioni insieme.
 */
export async function valutaRiga(
  input: PricingInput,
  dataSource: ListinoDataSource,
  opzioni: ValutaRigaOpzioni = {},
): Promise<RigaValutata> {
  const quantita = input.quantita ?? 1;
  const forzato = opzioni.prezzoForzato;
  const soglia = opzioni.sogliaScostamento ?? 0.1;

  // Riga libera: nessun prodotto a catalogo dietro.
  if (!haRiferimentoProdotto(input)) {
    const avvisoLibera: AvvisoRiga = {
      codice: "RIGA_LIBERA",
      severita: "media",
      messaggio:
        "Riga libera: il prezzo non e' tracciato a listino e non rientra nelle statistiche di marginalita.",
    };
    if (prezzoForzatoValido(forzato)) {
      const prezzoUnitario = roundCurrency(forzato);
      return {
        stato: "manuale",
        prezzoUnitario,
        quantita,
        totale: roundCurrency(prezzoUnitario * quantita),
        breakdown: null,
        codiceErrore: null,
        avvisi: [avvisoLibera],
      };
    }
    return {
      stato: "da_quotare",
      prezzoUnitario: 0,
      quantita,
      totale: 0,
      breakdown: null,
      codiceErrore: null,
      avvisi: [
        avvisoLibera,
        {
          codice: "PREZZO_NON_DISPONIBILE",
          severita: "alta",
          messaggio:
            "Riga libera senza prezzo: inserire un importo a mano prima dell'invio.",
        },
      ],
    };
  }

  let breakdown: PriceBreakdown | null = null;
  let codiceErrore: ListinoPricingErrorCode | null = null;

  try {
    breakdown = await calcolaPrezzo({ ...input, quantita }, dataSource);
  } catch (err) {
    if (err instanceof ListinoPricingError) {
      codiceErrore = err.code;
    } else {
      throw err;
    }
  }

  // Prezzo imposto a mano: vince sempre, ma si confronta con il listino.
  if (prezzoForzatoValido(forzato)) {
    const prezzoUnitario = roundCurrency(forzato);
    const avvisi: AvvisoRiga[] = [];

    if (breakdown) {
      const calcolato = breakdown.prezzoUnitario;
      if (
        calcolato > 0 &&
        Math.abs(prezzoUnitario - calcolato) / calcolato > soglia
      ) {
        avvisi.push({
          codice: "PREZZO_FORZATO",
          severita: "media",
          messaggio: `Prezzo imposto a mano (${prezzoUnitario.toFixed(2)}) diverso da quello di listino (${calcolato.toFixed(2)}).`,
        });
      }
      avvisi.push(...avvisiCoefficientiNonTarati(breakdown));
    }

    return {
      stato: "manuale",
      prezzoUnitario,
      quantita,
      totale: roundCurrency(prezzoUnitario * quantita),
      breakdown,
      codiceErrore,
      avvisi,
    };
  }

  if (!breakdown) {
    return {
      stato: "da_quotare",
      prezzoUnitario: 0,
      quantita,
      totale: 0,
      breakdown: null,
      codiceErrore,
      avvisi: [avvisoDaErrore(codiceErrore ?? "PRODOTTO_NON_TROVATO")],
    };
  }

  return {
    stato: "quotata",
    prezzoUnitario: breakdown.prezzoUnitario,
    quantita: breakdown.quantita,
    totale: breakdown.totale,
    breakdown,
    codiceErrore: null,
    avvisi: avvisiCoefficientiNonTarati(breakdown),
  };
}

/** Riepilogo per la barra avvisi in testa alla schermata di verifica. */
export function riepilogaAvvisi(righe: RigaValutata[]): {
  alta: number;
  media: number;
  bassa: number;
  bloccanti: number;
} {
  let alta = 0;
  let media = 0;
  let bassa = 0;
  for (const riga of righe) {
    for (const avviso of riga.avvisi) {
      if (avviso.severita === "alta") alta += 1;
      else if (avviso.severita === "media") media += 1;
      else bassa += 1;
    }
  }
  return {
    alta,
    media,
    bassa,
    bloccanti: righe.filter((r) => r.stato === "da_quotare").length,
  };
}
