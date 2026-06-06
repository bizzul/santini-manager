import { z } from "zod";
import { DOCUMENT_TYPE_IDS } from "@/lib/documenti/document-types";
import { parseAiNumber } from "@/lib/documenti/parse-ai-number";

const aiNumber = z.preprocess((value) => {
  const parsed = parseAiNumber(value);
  return parsed ?? value;
}, z.number());

const aiNullableNumber = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = parseAiNumber(value);
  return parsed ?? value;
}, z.number().nullable());

const aiBoolean = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return value;
}, z.boolean());

export const TipoDocumentoEnum = z.enum(DOCUMENT_TYPE_IDS);
export type TipoDocumento = z.infer<typeof TipoDocumentoEnum>;

export const UnitaEnum = z.enum([
  "m1",
  "Pz.",
  "h",
  "mq",
  "ml",
  "kg",
  "forfait",
]);
export type UnitaMisura = z.infer<typeof UnitaEnum>;

export const AllegatoSchema = z.object({
  name: z.string(),
  url: z.string(),
  storagePath: z.string(),
  size: z.number().optional(),
  mimeType: z.string().optional(),
});

export type Allegato = z.infer<typeof AllegatoSchema>;

export const DestinatarioInputSchema = z.object({
  tipo: z.enum(["cliente", "fornitore", "manuale"]).default("manuale"),
  entityId: z.number().nullable().optional(),
  ragioneSociale: z.string().min(1, "Ragione sociale obbligatoria"),
  aca: z.string().nullable().optional(),
  via: z.string().nullable().optional(),
  cap: z.string().nullable().optional(),
  citta: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

export type DestinatarioInput = z.infer<typeof DestinatarioInputSchema>;

/** Cio' che l'AI estrae per ogni riga: MAI totali (li calcola il server). */
export const AIRigaSchema = z.object({
  descrizione: z
    .string()
    .describe("Descrizione articolo, puo' essere multi-riga"),
  misure: z
    .string()
    .nullable()
    .describe("Testo 'Misure: ...' se presente, altrimenti null"),
  unita: UnitaEnum.describe("Unita' di misura: m1, Pz., ecc."),
  quantita: aiNumber.describe("Quantita' (Q), numero JSON"),
  prezzoUnitario: aiNumber.describe(
    "Prezzo unitario numerico, senza CHF ne simboli",
  ),
  sconto: aiNullableNumber.describe(
    "Sconto % di riga come numero; null per FATTURA o se assente",
  ),
  isTrasporto: aiBoolean.describe("true se e' la riga trasporto (TR-01)"),
});

export type AIRiga = z.infer<typeof AIRigaSchema>;

export const AIDestinatarioSchema = z.object({
  ragioneSociale: z.string().describe("Ragione sociale del destinatario"),
  aca: z
    .string()
    .nullable()
    .describe("Persona di riferimento (a.c.a), null se assente"),
  via: z.string().nullable(),
  cap: z.string().nullable(),
  citta: z.string().nullable(),
});

export const AIDocumentoSchema = z.object({
  tipoDocumento: TipoDocumentoEnum,
  destinatario: AIDestinatarioSchema,
  oggetto: z
    .string()
    .describe("Descrizione oggetto del documento"),
  righe: z.array(AIRigaSchema),
  condizioniPagamento: z.array(z.string()),
  termineFornitura: z.string().nullable(),
  note: z.string().nullable(),
});

export type AIDocumento = z.infer<typeof AIDocumentoSchema>;

/** Output AI per documenti letter (prosa). */
export const GeneratedLetterSchema = z.object({
  tipoDocumento: TipoDocumentoEnum,
  destinatario: AIDestinatarioSchema,
  oggetto: z.string(),
  corpoTesto: z
    .string()
    .describe("Corpo della lettera in prosa, con paragrafi separati da newline"),
  note: z.string().nullable(),
});

export type GeneratedLetter = z.infer<typeof GeneratedLetterSchema>;

/** Arricchito dopo il tool use: id trovato in DB o flag "nuovo". */
export const RigaArricchitaSchema = AIRigaSchema.extend({
  articoloId: z.union([z.string(), z.number()]).nullable(),
  articoloSource: z.enum(["sell_product", "inventory", "none"]).optional(),
  isNuovo: z.boolean(),
  art: z.string().optional(),
  totaleRiga: z.number().optional(),
});

export type RigaArricchita = z.infer<typeof RigaArricchitaSchema>;

export const DestinatarioArricchitoSchema = AIDestinatarioSchema.extend({
  clienteId: z.number().nullable(),
  fornitoreId: z.number().nullable().optional(),
  isNuovo: z.boolean(),
  email: z.string().nullable().optional(),
});

export const TotaliDocumentoSchema = z.object({
  totNetto: z.number(),
  iva: z.number(),
  totaleCHF: z.number(),
});

export const DocumentoArricchitoSchema = z.object({
  tipoDocumento: TipoDocumentoEnum,
  destinatario: DestinatarioArricchitoSchema,
  oggetto: z.string(),
  righe: z.array(RigaArricchitaSchema).default([]),
  condizioniPagamento: z.array(z.string()).default([]),
  termineFornitura: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  corpoTesto: z.string().nullable().optional(),
  totali: TotaliDocumentoSchema.optional(),
  allegati: z.array(AllegatoSchema).optional(),
});

export type DocumentoArricchito = z.infer<typeof DocumentoArricchitoSchema>;

export const GenerateDocumentRequestSchema = z.object({
  tipoDocumento: TipoDocumentoEnum,
  destinatario: DestinatarioInputSchema,
  oggetto: z.string().min(1, "Oggetto obbligatorio"),
  testo: z.string().min(1, "Il testo descrittivo e' obbligatorio"),
  allegati: z.array(AllegatoSchema).optional().default([]),
  taskId: z.number().nullable().optional(),
  offertaCodice: z.string().nullable().optional(),
});

export type GenerateDocumentRequest = z.infer<
  typeof GenerateDocumentRequestSchema
>;

export const SaveDocumentRequestSchema = DocumentoArricchitoSchema.extend({
  sourceText: z.string().optional(),
  taskId: z.number().nullable().optional(),
  documentoId: z.string().uuid().optional(),
});

export type SaveDocumentRequest = z.infer<typeof SaveDocumentRequestSchema>;
