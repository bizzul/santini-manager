import { getDocumentTypeConfig } from "@/lib/documenti/document-types";
import { buildStructureMapPromptSection } from "@/lib/documenti/build-structure-prompt";
import type { DocumentTemplate } from "@/lib/documenti/template-types";
import type { GenerateDocumentRequest } from "@/validation/documenti/extracted-document";

export const GENERATE_BASE_SYSTEM_PROMPT = `Sei un assistente specializzato nella redazione di documenti aziendali in italiano svizzero.

REGOLE FONDAMENTALI:
1. Restituisci SOLO dati strutturati in JSON. NON scrivere mai testo fuori dal JSON.
2. NON calcolare mai: totale riga, Tot. Netto, IVA 8.1%, Totale CHF.
3. NON generare il numero documento (assegnato dal sistema al salvataggio).
4. NON estrarre mittente, coordinate bancarie o IBAN (vengono dal template aziendale).
5. Per documenti commerciali: usa i risultati ricerche database forniti nel prompt per collegare cliente e articoli esistenti.
6. Per documenti letter: genera corpoTesto in prosa formale con paragrafi separati da \\n\\n.
7. Nei documenti commerciali, quantita, prezzoUnitario e sconto devono essere numeri JSON (es. 12.5), mai stringhe con CHF o testo.`;

export function buildGenerateSystemPrompt(
  tipoDocumento: string,
  templateMeta?: Pick<
    DocumentTemplate,
    "templateModelText" | "structureMap"
  > | null,
): string {
  const config = getDocumentTypeConfig(tipoDocumento);
  const instructions = config?.promptInstructions ?? "";
  const structureSection = templateMeta
    ? buildStructureMapPromptSection(templateMeta)
    : "";

  return `${GENERATE_BASE_SYSTEM_PROMPT}

TIPO DOCUMENTO: ${config?.label ?? tipoDocumento}
ISTRUZIONI SPECIFICHE:
${instructions}${structureSection}`;
}

export function buildGenerateUserPrompt(
  input: GenerateDocumentRequest,
  today: string,
): string {
  const dest = input.destinatario;
  const allegatiInfo =
    input.allegati && input.allegati.length > 0
      ? `\nAllegati forniti dall'utente: ${input.allegati.map((a) => a.name).join(", ")}`
      : "";

  const offertaInfo = input.offertaCodice
    ? `\nOfferta collegata nel gestionale: ${input.offertaCodice}`
    : "";

  return `Data odierna: ${today}

Tipo documento: ${input.tipoDocumento}${offertaInfo}
Destinatario: ${dest.ragioneSociale}${dest.aca ? ` (a.c.a ${dest.aca})` : ""}
${[dest.via, dest.cap, dest.citta].filter(Boolean).join(", ") || ""}

Oggetto: ${input.oggetto}

Descrizione obiettivo / contenuto da sviluppare:
---
${input.testo}
---${allegatiInfo}

Genera il documento strutturato secondo le istruzioni del tipo selezionato.`;
}
