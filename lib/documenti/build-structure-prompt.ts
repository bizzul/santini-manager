import type { DocumentTemplate } from "@/lib/documenti/template-types";

export function buildStructureMapPromptSection(
  template: Pick<
    DocumentTemplate,
    "templateModelText" | "structureMap"
  >,
): string {
  const parts: string[] = [];

  if (template.templateModelText?.trim()) {
    parts.push(
      `MODELLO CARTA INTESTATA (rispetta questa struttura e i placeholder):
---
${template.templateModelText.trim()}
---`,
    );
  }

  if (template.structureMap?.sections?.length) {
    const sections = [...template.structureMap.sections]
      .sort((a, b) => a.order - b.order)
      .map((section) => {
        const fields = [...section.fields]
          .sort((a, b) => a.order - b.order)
          .map(
            (f) =>
              `  - ${f.placeholderId} (${f.type}): ${f.label}${f.sampleText ? ` [es: ${f.sampleText}]` : ""}`,
          )
          .join("\n");
        return `${section.order}. ${section.id} — ${section.label}\n${fields}`;
      })
      .join("\n\n");

    parts.push(
      `STRUTTURA DOCUMENTO ANALIZZATA (mantieni ordine e campi):
${sections}`,
    );

    if (template.structureMap.notes) {
      parts.push(`Note struttura: ${template.structureMap.notes}`);
    }
  }

  if (parts.length === 0) return "";

  return `\n\nVINCOLI LAYOUT DA MODELLO AZIENDALE:\n${parts.join("\n\n")}`;
}
