import { generateObject } from "ai";
import type { LanguageModel } from "ai";
import {
  TemplateStructureMapSchema,
  type TemplateStructureMap,
} from "@/lib/documenti/template-structure-types";

const ANALYZE_SYSTEM_PROMPT = `Sei un esperto di modelli documentali aziendali.
Analizza il testo estratto da un documento di riferimento (PDF, Word o Excel) e produci una mappa strutturale JSON.

REGOLE:
1. Identifica sezioni logiche nell'ordine verticale: header, destinatario, oggetto, corpo, tabella_righe, totali, footer.
2. Per ogni sezione elenca i campi con placeholderId in formato snake_case (es. destinatario_nome, oggetto, corpo_testo, totale_chf).
3. Tipo campo: text, table, money, date.
4. Includi sampleText se visibile nel documento di riferimento.
5. Se il modello testuale con {{placeholder}} e' fornito, allinea i placeholderId a quelli nel testo.
6. Restituisci SOLO JSON valido secondo lo schema.`;

export async function analyzeTemplateStructure(params: {
  model: LanguageModel;
  extractedText: string;
  templateModelText?: string | null;
}): Promise<TemplateStructureMap> {
  const modelTextBlock = params.templateModelText?.trim()
    ? `\n\nModello testuale con placeholder:\n---\n${params.templateModelText}\n---`
    : "";

  const { object } = await generateObject({
    model: params.model,
    schema: TemplateStructureMapSchema,
    system: ANALYZE_SYSTEM_PROMPT,
    prompt: `Testo estratto dal documento di riferimento:
---
${params.extractedText.slice(0, 12000)}
---${modelTextBlock}

Produci la mappa strutturale completa.`,
  });

  return object;
}
