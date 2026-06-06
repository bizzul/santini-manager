/**
 * Configurazione estensibile dei tipi documento.
 * Per aggiungere un nuovo tipo: inserire una voce in DOCUMENT_TYPES.
 */

export type DocumentCategory = "commercial" | "letter";

export type DocumentTypeId =
  | "OFFERTA"
  | "CONFERMA"
  | "FATTURA"
  | "PREVENTIVO"
  | "LETTERA_UFFICIALE"
  | "RISPOSTA_COMUNICAZIONE"
  | "SOLLECITO_PAGAMENTO"
  | "COMUNICAZIONE_GENERICA";

export interface DocumentTypeConfig {
  id: DocumentTypeId;
  label: string;
  category: DocumentCategory;
  hasLineItems: boolean;
  hasNumber: boolean;
  showDiscount: boolean;
  destinatarioLabel: string;
  promptInstructions: string;
}

export const DOCUMENT_TYPES: DocumentTypeConfig[] = [
  {
    id: "OFFERTA",
    label: "Offerta",
    category: "commercial",
    hasLineItems: true,
    hasNumber: true,
    showDiscount: true,
    destinatarioLabel: "Cliente:",
    promptInstructions:
      "Redigi un'offerta commerciale formale in italiano svizzero. Estrai righe articolo con quantita', prezzo unitario e sconto % se menzionati. Includi condizioni di pagamento e termine di fornitura se indicati. NON calcolare totali.",
  },
  {
    id: "CONFERMA",
    label: "Conferma d'ordine",
    category: "commercial",
    hasLineItems: true,
    hasNumber: true,
    showDiscount: true,
    destinatarioLabel: "Cliente:",
    promptInstructions:
      "Redigi una conferma d'ordine formale. Struttura come offerta commerciale con righe articolo, condizioni di pagamento e termine di fornitura. NON calcolare totali.",
  },
  {
    id: "FATTURA",
    label: "Fattura",
    category: "commercial",
    hasLineItems: true,
    hasNumber: true,
    showDiscount: false,
    destinatarioLabel: "Utente:",
    promptInstructions:
      "Redigi una fattura formale. Righe articolo senza sconto percentuale (sconto sempre null). Includi condizioni di pagamento se indicate. NON calcolare totali ne IVA.",
  },
  {
    id: "PREVENTIVO",
    label: "Preventivo",
    category: "commercial",
    hasLineItems: true,
    hasNumber: true,
    showDiscount: true,
    destinatarioLabel: "Cliente:",
    promptInstructions:
      "Redigi un preventivo commerciale non vincolante. Tono professionale ma meno formale di un'offerta vincolante. Righe articolo con prezzi indicativi. NON calcolare totali.",
  },
  {
    id: "LETTERA_UFFICIALE",
    label: "Lettera ufficiale",
    category: "letter",
    hasLineItems: false,
    hasNumber: false,
    showDiscount: false,
    destinatarioLabel: "Destinatario:",
    promptInstructions:
      "Redigi una lettera ufficiale su carta intestata. Tono formale e professionale. Struttura: intestazione destinatario, oggetto, corpo con paragrafi chiari, formula di cortesia conclusiva. NON usare tabelle articoli.",
  },
  {
    id: "RISPOSTA_COMUNICAZIONE",
    label: "Risposta a comunicazione",
    category: "letter",
    hasLineItems: false,
    hasNumber: false,
    showDiscount: false,
    destinatarioLabel: "Destinatario:",
    promptInstructions:
      "Redigi una risposta formale a una comunicazione in entrata. Riferisciti al contenuto descritto dall'utente. Tono professionale e cortese. Struttura a paragrafi, senza tabelle.",
  },
  {
    id: "SOLLECITO_PAGAMENTO",
    label: "Sollecito di pagamento",
    category: "letter",
    hasLineItems: false,
    hasNumber: false,
    showDiscount: false,
    destinatarioLabel: "Destinatario:",
    promptInstructions:
      "Redigi un sollecito di pagamento formale ma fermo. Indica l'importo dovuto e i riferimenti se forniti dall'utente. Richiedi il saldo entro un termine ragionevole. Tono professionale.",
  },
  {
    id: "COMUNICAZIONE_GENERICA",
    label: "Comunicazione / circolare",
    category: "letter",
    hasLineItems: false,
    hasNumber: false,
    showDiscount: false,
    destinatarioLabel: "Destinatario:",
    promptInstructions:
      "Redigi una comunicazione generica o circolare aziendale. Tono chiaro e diretto. Struttura a paragrafi. Adatta il registro al contesto descritto dall'utente.",
  },
];

export const DOCUMENT_TYPE_IDS = DOCUMENT_TYPES.map((t) => t.id) as [
  DocumentTypeId,
  ...DocumentTypeId[],
];

export function getDocumentTypeConfig(
  id: string,
): DocumentTypeConfig | undefined {
  return DOCUMENT_TYPES.find((t) => t.id === id);
}

export function isCommercialType(id: string): boolean {
  return getDocumentTypeConfig(id)?.category === "commercial";
}

export function isLetterType(id: string): boolean {
  return getDocumentTypeConfig(id)?.category === "letter";
}

export function getDocumentTypeLabel(id: string): string {
  return getDocumentTypeConfig(id)?.label ?? id;
}

export function getDocumentDestinatarioLabel(id: string): string {
  return getDocumentTypeConfig(id)?.destinatarioLabel ?? "Destinatario:";
}
