import type { Template } from "@pdfme/common";

export type LetterheadFieldCategory = "header" | "body" | "footer";
export type LetterheadFieldType = "text" | "table";
export type LetterheadTemplateVariant = "commercial" | "letter";
export type LetterheadLayoutPreset = "santini" | "matris" | "lettera";

export type LetterheadFieldId =
  | "data"
  | "destinatario"
  | "numeroDocumento"
  | "oggetto"
  | "tabellaRighe"
  | "totaleNetto"
  | "iva"
  | "totale"
  | "condizioniPagamento"
  | "termineFornitura"
  | "noteAggiuntive"
  | "luogo"
  | "firmaAccettazione"
  | "corpoTesto";

export interface LetterheadFieldDefinition {
  id: LetterheadFieldId;
  label: string;
  description: string;
  category: LetterheadFieldCategory;
  type: LetterheadFieldType;
  variant: LetterheadTemplateVariant;
  required: boolean;
  sampleContent: string;
  defaultEnabled: boolean;
}

type TextAlignment = "left" | "center" | "right";

interface FieldLayout {
  position: { x: number; y: number };
  width: number;
  height: number;
  fontSize?: number;
  alignment?: TextAlignment;
}

const TABLE_HEAD = ["Art.", "Descrizione", "U", "Q", "Prezzo", "%", "Totale"];
const TABLE_WIDTHS = [8, 38, 6, 8, 12, 8, 20];

export const LETTERHEAD_FIELD_CATALOG: LetterheadFieldDefinition[] = [
  {
    id: "data",
    label: "Data documento",
    description: "Data in alto a destra",
    category: "header",
    type: "text",
    variant: "commercial",
    required: true,
    sampleContent: "08 giugno 2026",
    defaultEnabled: true,
  },
  {
    id: "destinatario",
    label: "Indirizzo cliente",
    description: "Blocco destinatario (Spettabile, a.c.a, indirizzo)",
    category: "header",
    type: "text",
    variant: "commercial",
    required: true,
    sampleContent: "Spettabile\nCliente\nVia Example 1\n6500 Bellinzona",
    defaultEnabled: true,
  },
  {
    id: "numeroDocumento",
    label: "Numero documento",
    description: "Tipo e numero (es. Offerta N°: 26-128)",
    category: "header",
    type: "text",
    variant: "commercial",
    required: true,
    sampleContent: "Offerta N°: 26-128",
    defaultEnabled: true,
  },
  {
    id: "oggetto",
    label: "Titolo / oggetto",
    description: "Titolo descrittivo del documento",
    category: "body",
    type: "text",
    variant: "commercial",
    required: true,
    sampleContent: "Medical Manager",
    defaultEnabled: true,
  },
  {
    id: "tabellaRighe",
    label: "Tabella posizioni",
    description: "Righe articolo con colonne standard",
    category: "body",
    type: "table",
    variant: "commercial",
    required: true,
    sampleContent: JSON.stringify([]),
    defaultEnabled: true,
  },
  {
    id: "totaleNetto",
    label: "Totale netto",
    description: "Riga totale netto",
    category: "footer",
    type: "text",
    variant: "commercial",
    required: true,
    sampleContent: "Tot. Netto: CHF 0.00",
    defaultEnabled: true,
  },
  {
    id: "iva",
    label: "IVA",
    description: "Riga IVA",
    category: "footer",
    type: "text",
    variant: "commercial",
    required: true,
    sampleContent: "IVA 8.1%: CHF 0.00",
    defaultEnabled: true,
  },
  {
    id: "totale",
    label: "Totale CHF",
    description: "Totale finale",
    category: "footer",
    type: "text",
    variant: "commercial",
    required: true,
    sampleContent: "Totale CHF: 0.00",
    defaultEnabled: true,
  },
  {
    id: "condizioniPagamento",
    label: "Condizioni pagamento",
    description: "Elenco condizioni di pagamento",
    category: "footer",
    type: "text",
    variant: "commercial",
    required: false,
    sampleContent: "Condizioni di pagamento:\n- 50% all'ordine",
    defaultEnabled: true,
  },
  {
    id: "termineFornitura",
    label: "Termine fornitura",
    description: "Termine di consegna",
    category: "footer",
    type: "text",
    variant: "commercial",
    required: false,
    sampleContent: "Termine di fornitura: 3-4 settimane",
    defaultEnabled: true,
  },
  {
    id: "noteAggiuntive",
    label: "Note / trasporto",
    description: "Note aggiuntive a piè di pagina",
    category: "footer",
    type: "text",
    variant: "commercial",
    required: false,
    sampleContent: "Trasporto franco fabbrica",
    defaultEnabled: false,
  },
  {
    id: "luogo",
    label: "Luogo",
    description: "Luogo per firma (es. Giubiasco)",
    category: "footer",
    type: "text",
    variant: "commercial",
    required: false,
    sampleContent: "Luogo: Giubiasco",
    defaultEnabled: false,
  },
  {
    id: "firmaAccettazione",
    label: "Firma accettazione",
    description: "Etichetta area firma",
    category: "footer",
    type: "text",
    variant: "commercial",
    required: false,
    sampleContent: "Firma per accettazione:",
    defaultEnabled: false,
  },
  {
    id: "data",
    label: "Data",
    description: "Data documento",
    category: "header",
    type: "text",
    variant: "letter",
    required: true,
    sampleContent: "08 giugno 2026",
    defaultEnabled: true,
  },
  {
    id: "destinatario",
    label: "Destinatario",
    description: "Blocco destinatario",
    category: "header",
    type: "text",
    variant: "letter",
    required: true,
    sampleContent: "Spettabile\nDestinatario",
    defaultEnabled: true,
  },
  {
    id: "oggetto",
    label: "Oggetto",
    description: "Oggetto della lettera",
    category: "body",
    type: "text",
    variant: "letter",
    required: true,
    sampleContent: "Oggetto: —",
    defaultEnabled: true,
  },
  {
    id: "corpoTesto",
    label: "Corpo lettera",
    description: "Testo principale della lettera",
    category: "body",
    type: "text",
    variant: "letter",
    required: true,
    sampleContent: "Corpo della lettera…",
    defaultEnabled: true,
  },
];

const COMMERCIAL_LAYOUTS: Record<
  LetterheadLayoutPreset,
  Partial<Record<LetterheadFieldId, FieldLayout>>
> = {
  matris: {
    data: { position: { x: 155, y: 42 }, width: 40, height: 8, fontSize: 10 },
    destinatario: {
      position: { x: 15, y: 42 },
      width: 85,
      height: 24,
      fontSize: 10,
    },
    numeroDocumento: {
      position: { x: 15, y: 68 },
      width: 180,
      height: 8,
      fontSize: 10,
    },
    oggetto: {
      position: { x: 15, y: 76 },
      width: 180,
      height: 10,
      fontSize: 11,
    },
    tabellaRighe: { position: { x: 15, y: 88 }, width: 180, height: 110 },
    totaleNetto: {
      position: { x: 140, y: 202 },
      width: 55,
      height: 6,
      fontSize: 9,
      alignment: "right",
    },
    iva: {
      position: { x: 140, y: 209 },
      width: 55,
      height: 6,
      fontSize: 9,
      alignment: "right",
    },
    totale: {
      position: { x: 140, y: 216 },
      width: 55,
      height: 7,
      fontSize: 10,
      alignment: "right",
    },
    condizioniPagamento: {
      position: { x: 15, y: 226 },
      width: 120,
      height: 20,
      fontSize: 9,
    },
    termineFornitura: {
      position: { x: 15, y: 249 },
      width: 120,
      height: 10,
      fontSize: 9,
    },
    noteAggiuntive: {
      position: { x: 15, y: 262 },
      width: 120,
      height: 12,
      fontSize: 9,
    },
    luogo: { position: { x: 15, y: 276 }, width: 60, height: 8, fontSize: 9 },
    firmaAccettazione: {
      position: { x: 100, y: 276 },
      width: 80,
      height: 8,
      fontSize: 9,
    },
  },
  santini: {
    data: {
      position: { x: 155, y: 38 },
      width: 40,
      height: 8,
      fontSize: 10,
      alignment: "right",
    },
    destinatario: {
      position: { x: 120, y: 48 },
      width: 75,
      height: 28,
      fontSize: 10,
      alignment: "left",
    },
    numeroDocumento: {
      position: { x: 15, y: 62 },
      width: 90,
      height: 8,
      fontSize: 10,
    },
    oggetto: {
      position: { x: 15, y: 72 },
      width: 180,
      height: 10,
      fontSize: 11,
    },
    tabellaRighe: { position: { x: 15, y: 86 }, width: 180, height: 115 },
    totaleNetto: {
      position: { x: 130, y: 205 },
      width: 65,
      height: 6,
      fontSize: 9,
      alignment: "right",
    },
    iva: {
      position: { x: 130, y: 212 },
      width: 65,
      height: 6,
      fontSize: 9,
      alignment: "right",
    },
    totale: {
      position: { x: 130, y: 219 },
      width: 65,
      height: 7,
      fontSize: 10,
      alignment: "right",
    },
    condizioniPagamento: {
      position: { x: 15, y: 230 },
      width: 100,
      height: 18,
      fontSize: 9,
    },
    termineFornitura: {
      position: { x: 15, y: 250 },
      width: 120,
      height: 10,
      fontSize: 9,
    },
    noteAggiuntive: {
      position: { x: 15, y: 262 },
      width: 180,
      height: 14,
      fontSize: 8,
    },
    luogo: { position: { x: 15, y: 280 }, width: 55, height: 8, fontSize: 9 },
    firmaAccettazione: {
      position: { x: 120, y: 280 },
      width: 75,
      height: 8,
      fontSize: 9,
    },
  },
  lettera: {
    data: { position: { x: 155, y: 42 }, width: 40, height: 8, fontSize: 10 },
    destinatario: {
      position: { x: 15, y: 42 },
      width: 85,
      height: 24,
      fontSize: 10,
    },
    oggetto: {
      position: { x: 15, y: 70 },
      width: 180,
      height: 10,
      fontSize: 11,
    },
    corpoTesto: {
      position: { x: 15, y: 84 },
      width: 180,
      height: 160,
      fontSize: 10,
    },
  },
};

function textSchema(
  field: LetterheadFieldDefinition,
  layout: FieldLayout,
): Record<string, unknown> {
  return {
    type: "text",
    position: layout.position,
    width: layout.width,
    height: layout.height,
    content: field.sampleContent,
    fontSize: layout.fontSize ?? 10,
    alignment: layout.alignment ?? "left",
    verticalAlignment: "top",
    lineHeight: 1.2,
    fontColor: "#000000",
    backgroundColor: "",
  };
}

function tableSchema(layout: FieldLayout): Record<string, unknown> {
  return {
    type: "table",
    position: layout.position,
    width: layout.width,
    height: layout.height,
    content: JSON.stringify([]),
    showHead: true,
    head: TABLE_HEAD,
    headWidthPercentages: TABLE_WIDTHS,
    tableStyles: { borderColor: "#000000", borderWidth: 0.3 },
    headStyles: {
      fontSize: 8,
      alignment: "left",
      verticalAlignment: "middle",
      lineHeight: 1,
      fontColor: "#000000",
      backgroundColor: "#f0f0f0",
      borderColor: "#000000",
      borderWidth: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
      padding: { top: 2, right: 2, bottom: 2, left: 2 },
    },
    bodyStyles: {
      fontSize: 8,
      alignment: "left",
      verticalAlignment: "top",
      lineHeight: 1.1,
      fontColor: "#000000",
      backgroundColor: "",
      borderColor: "#cccccc",
      borderWidth: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
      padding: { top: 2, right: 2, bottom: 2, left: 2 },
      alternateBackgroundColor: "#fafafa",
    },
    columnStyles: {},
  };
}

export function getFieldDefinition(
  id: LetterheadFieldId,
  variant: LetterheadTemplateVariant,
): LetterheadFieldDefinition | undefined {
  return LETTERHEAD_FIELD_CATALOG.find(
    (f) => f.id === id && f.variant === variant,
  );
}

export function getFieldsForVariant(
  variant: LetterheadTemplateVariant,
): LetterheadFieldDefinition[] {
  return LETTERHEAD_FIELD_CATALOG.filter((f) => f.variant === variant);
}

export function getDefaultEnabledFieldIds(
  variant: LetterheadTemplateVariant,
): LetterheadFieldId[] {
  return getFieldsForVariant(variant)
    .filter((f) => f.defaultEnabled)
    .map((f) => f.id);
}

export function buildSchemaFromCatalog(
  fieldId: LetterheadFieldId,
  variant: LetterheadTemplateVariant,
  preset: LetterheadLayoutPreset,
  existing?: Record<string, unknown>,
): Record<string, unknown> | null {
  const field = getFieldDefinition(fieldId, variant);
  if (!field) return null;

  const layoutMap =
    variant === "letter"
      ? COMMERCIAL_LAYOUTS.lettera
      : COMMERCIAL_LAYOUTS[preset === "lettera" ? "matris" : preset];

  const layout = layoutMap[fieldId];
  if (!layout) return null;

  const base =
    field.type === "table" ? tableSchema(layout) : textSchema(field, layout);

  if (existing) {
    return { ...base, ...existing, type: base.type };
  }
  return base;
}

export function buildTemplateFromCatalog(
  basePdfUrl: string,
  variant: LetterheadTemplateVariant,
  preset: LetterheadLayoutPreset,
  enabledFieldIds?: LetterheadFieldId[],
): Template {
  const ids =
    enabledFieldIds ??
    getDefaultEnabledFieldIds(variant === "letter" ? "letter" : "commercial");

  const effectivePreset =
    variant === "letter" ? "lettera" : preset === "lettera" ? "matris" : preset;

  const schemaPage: Record<string, Record<string, unknown>> = {};
  for (const id of ids) {
    const built = buildSchemaFromCatalog(id, variant, effectivePreset);
    if (built) schemaPage[id] = built;
  }

  return { basePdf: basePdfUrl, schemas: [schemaPage as Template["schemas"][number]] };
}

export interface AiFieldLayoutInput {
  fieldId: LetterheadFieldId;
  position: { x: number; y: number };
  width: number;
  height: number;
  fontSize?: number;
  alignment?: TextAlignment;
}

/** Costruisce un template pdfme dalle coordinate rilevate dall'AI (con fallback preset). */
export function buildTemplateFromAiLayouts(
  basePdfUrl: string,
  variant: LetterheadTemplateVariant,
  preset: LetterheadLayoutPreset,
  aiLayouts: AiFieldLayoutInput[],
): Template {
  const effectivePreset =
    variant === "letter" ? "lettera" : preset === "lettera" ? "matris" : preset;
  const aiById = new Map(aiLayouts.map((l) => [l.fieldId, l]));
  const ids = Array.from(
    new Set<LetterheadFieldId>([
      ...aiLayouts.map((l) => l.fieldId),
      ...getDefaultEnabledFieldIds(variant),
    ]),
  );

  const schemaPage: Record<string, Record<string, unknown>> = {};
  for (const id of ids) {
    const ai = aiById.get(id);
    const fallback = buildSchemaFromCatalog(id, variant, effectivePreset);
    if (!fallback) continue;

    if (ai) {
      const field = getFieldDefinition(id, variant);
      if (!field) continue;
      const layout: FieldLayout = {
        position: ai.position,
        width: ai.width,
        height: ai.height,
        fontSize: ai.fontSize,
        alignment: ai.alignment,
      };
      const built =
        field.type === "table" ? tableSchema(layout) : textSchema(field, layout);
      schemaPage[id] = built;
    } else {
      schemaPage[id] = fallback;
    }
  }

  return { basePdf: basePdfUrl, schemas: [schemaPage as Template["schemas"][number]] };
}

export function getEnabledFieldIdsFromTemplate(
  template: Template | null | undefined,
  variant: LetterheadTemplateVariant,
): LetterheadFieldId[] {
  if (!template?.schemas?.[0]) return [];
  const allowed = new Set(getFieldsForVariant(variant).map((f) => f.id));
  return Object.keys(template.schemas[0]).filter((k) =>
    allowed.has(k as LetterheadFieldId),
  ) as LetterheadFieldId[];
}

export function sanitizeTemplateWithCatalog(
  template: Template,
  variant: LetterheadTemplateVariant,
): Template {
  const allowed = new Set(getFieldsForVariant(variant).map((f) => f.id));
  const page = template.schemas[0] ?? {};
  const sanitized: Record<string, Record<string, unknown>> = {};
  for (const [key, schema] of Object.entries(page)) {
    if (allowed.has(key as LetterheadFieldId)) {
      sanitized[key] = schema as Record<string, unknown>;
    }
  }
  return { ...template, schemas: [sanitized as Template["schemas"][number]] };
}

export function syncTemplateWithCatalog(
  template: Template,
  variant: LetterheadTemplateVariant,
  preset: LetterheadLayoutPreset,
  enabledFieldIds: LetterheadFieldId[],
  savedPositions: Record<string, Record<string, unknown>> = {},
): Template {
  const effectivePreset =
    variant === "letter" ? "lettera" : preset === "lettera" ? "matris" : preset;
  const currentPage = template.schemas[0] ?? {};
  const nextPage: Record<string, Record<string, unknown>> = {};

  for (const id of enabledFieldIds) {
    const existing = currentPage[id] ?? savedPositions[id];
    const built = buildSchemaFromCatalog(
      id,
      variant,
      effectivePreset,
      existing as Record<string, unknown> | undefined,
    );
    if (built) nextPage[id] = built;
  }

  return { ...template, schemas: [nextPage as Template["schemas"][number]] };
}

export interface LetterheadFieldValidationIssue {
  fieldId: LetterheadFieldId;
  label: string;
  blocking: boolean;
}

export function validateTemplateFields(
  template: Template | null | undefined,
  variant: LetterheadTemplateVariant,
): LetterheadFieldValidationIssue[] {
  if (!template?.schemas?.length) return [];

  const present = new Set(getEnabledFieldIdsFromTemplate(template, variant));
  const issues: LetterheadFieldValidationIssue[] = [];

  for (const field of getFieldsForVariant(variant)) {
    if (field.required && !present.has(field.id)) {
      issues.push({
        fieldId: field.id,
        label: field.label,
        blocking: true,
      });
    }
  }

  return issues;
}

export function templateHasSeparateNumeroDocumento(
  template: Template | null | undefined,
): boolean {
  return Boolean(template?.schemas?.[0]?.numeroDocumento);
}

export function variantFromPreset(
  preset: LetterheadLayoutPreset,
): LetterheadTemplateVariant {
  return preset === "lettera" ? "letter" : "commercial";
}

export function presetLabel(preset: LetterheadLayoutPreset): string {
  switch (preset) {
    case "santini":
      return "Layout Santini";
    case "matris":
      return "Layout Matris";
    case "lettera":
      return "Layout lettera";
  }
}

/** @deprecated Usare buildTemplateFromCatalog */
export type PdfmeTemplateVariant = LetterheadTemplateVariant;

export function createDefaultPdfmeTemplate(
  basePdfUrl: string,
  variant: LetterheadTemplateVariant = "commercial",
  preset: LetterheadLayoutPreset = "matris",
): Template {
  return buildTemplateFromCatalog(basePdfUrl, variant, preset);
}

export function hasPdfmeOverlay(template: {
  pdfmeTemplate?: Template | null;
  letterheadBasePdf?: { url?: string | null } | null;
}): boolean {
  return Boolean(
    template.pdfmeTemplate?.schemas?.length &&
      (template.letterheadBasePdf?.url || template.pdfmeTemplate.basePdf),
  );
}

export function resolvePdfmeTemplateForRender(
  pdfmeTemplate: Template,
  letterheadUrl: string | null | undefined,
): Template {
  const basePdf =
    typeof pdfmeTemplate.basePdf === "string" && pdfmeTemplate.basePdf.trim()
      ? pdfmeTemplate.basePdf
      : letterheadUrl ?? pdfmeTemplate.basePdf;

  return {
    ...pdfmeTemplate,
    basePdf: basePdf ?? pdfmeTemplate.basePdf,
  };
}
