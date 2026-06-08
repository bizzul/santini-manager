import { generateObject } from "ai";
import type { LanguageModel } from "ai";
import { z } from "zod";
import type { PdfTextRegion } from "@/lib/documenti/extract-pdf-text-regions";
import {
  getFieldsForVariant,
  type LetterheadFieldId,
  type LetterheadTemplateVariant,
} from "@/lib/documenti/letterhead-field-catalog";

const LetterheadAiFieldLayoutSchema = z.object({
  fieldId: z.string(),
  position: z.object({
    x: z.number().min(0).max(210),
    y: z.number().min(0).max(297),
  }),
  width: z.number().min(5).max(210),
  height: z.number().min(3).max(200),
  fontSize: z.number().min(6).max(24).optional(),
  alignment: z.enum(["left", "center", "right"]).optional(),
});

export const LetterheadAiLayoutSchema = z.object({
  variant: z.enum(["commercial", "letter"]),
  fields: z.array(LetterheadAiFieldLayoutSchema),
  notes: z.string().nullable().optional(),
});

export type LetterheadAiFieldLayout = z.infer<typeof LetterheadAiFieldLayoutSchema>;
export type LetterheadAiLayout = z.infer<typeof LetterheadAiLayoutSchema>;

const COMMERCIAL_FIELD_IDS = [
  "data",
  "destinatario",
  "numeroDocumento",
  "oggetto",
  "tabellaRighe",
  "totaleNetto",
  "iva",
  "totale",
  "condizioniPagamento",
  "termineFornitura",
  "noteAggiuntive",
  "luogo",
  "firmaAccettazione",
] as const;

const LETTER_FIELD_IDS = ["data", "destinatario", "oggetto", "corpoTesto"] as const;

function formatRegionsForPrompt(regions: PdfTextRegion[]): string {
  return regions
    .slice(0, 120)
    .map(
      (r) =>
        `- y=${r.y.toFixed(1)}mm x=${r.x.toFixed(1)}mm w=${r.width.toFixed(1)}mm: "${r.text.slice(0, 120)}"`,
    )
    .join("\n");
}

export async function analyzeLetterheadFieldLayout(params: {
  model: LanguageModel;
  regions: PdfTextRegion[];
  extractedText: string;
  pageWidthMm: number;
  pageHeightMm: number;
}): Promise<LetterheadAiLayout> {
  const { object } = await generateObject({
    model: params.model,
    schema: LetterheadAiLayoutSchema,
    system: `Sei un esperto di impaginazione documenti commerciali A4 (210×297 mm).
Analizza un documento di riferimento già compilato e restituisci le coordinate pdfme (mm, origine alto-sinistra) per posizionare i campi dinamici del catalogo.

CAMPI COMMERCIALI (variant commercial):
${COMMERCIAL_FIELD_IDS.join(", ")}

CAMPI LETTERA (variant letter):
${LETTER_FIELD_IDS.join(", ")}

REGOLE:
1. Usa solo fieldId dal catalogo appropriato alla variant rilevata.
2. position.x/y = angolo alto-sinistra del riquadro campo in mm.
3. width/height in mm, sufficienti a contenere il contenuto tipico.
4. data: vicino alla data in alto a destra.
5. destinatario: blocco indirizzo cliente (Spettabile / ragione sociale).
6. numeroDocumento: riga "Offerta N°:" / "Conferma N°:" ecc. (separata dall'oggetto).
7. oggetto: titolo descrittivo sotto il numero documento.
8. tabellaRighe: area tabella con colonne Art/Descrizione/U/Q/Prezzo (height ≥ 80mm se presente).
9. totaleNetto, iva, totale: blocchi totali in basso a destra.
10. condizioniPagamento / termineFornitura: testo multiriga in basso a sinistra se presente.
11. Includi tutti i campi obbligatori della variant; opzionali solo se individuabili nel documento.
12. Non inventare campi fuori catalogo.`,
    prompt: `Pagina A4: ${params.pageWidthMm.toFixed(1)}×${params.pageHeightMm.toFixed(1)} mm

Regioni di testo (coordinate da alto-sinistra):
${formatRegionsForPrompt(params.regions)}

Testo completo estratto:
---
${params.extractedText.slice(0, 10000)}
---

Restituisci layout campi pdfme con coordinate precise.`,
  });

  return object;
}

export function filterValidAiFieldLayouts(
  layout: LetterheadAiLayout,
): LetterheadAiFieldLayout[] {
  const allowed = new Set(
    getFieldsForVariant(layout.variant).map((f) => f.id),
  );
  const seen = new Set<LetterheadFieldId>();

  return layout.fields.filter((field) => {
    const id = field.fieldId as LetterheadFieldId;
    if (!allowed.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
