import type { DocumentTypeId } from "@/lib/documenti/document-types";
import { DOCUMENT_TYPE_IDS } from "@/lib/documenti/document-types";
import type {
  DocumentTemplateConfig,
  DocumentTypeTemplateEntry,
} from "@/lib/documenti/template-types";

/** Entry per-tipo con fallback al template legacy top-level. */
export function getDocumentTypeTemplateEntry(
  config: DocumentTemplateConfig | null | undefined,
  tipo: DocumentTypeId,
): DocumentTypeTemplateEntry | null {
  const cfg = config ?? {};
  const byType = cfg.templatesByType?.[tipo];
  if (
    byType &&
    (byType.letterheadBasePdf?.url || byType.pdfmeTemplate?.schemas?.length)
  ) {
    return byType;
  }

  if (cfg.letterheadBasePdf?.url || cfg.pdfmeTemplate?.schemas?.length) {
    return {
      letterheadBasePdf: cfg.letterheadBasePdf ?? null,
      pdfmeTemplate: cfg.pdfmeTemplate ?? null,
      letterheadLayoutPreset: cfg.letterheadLayoutPreset ?? null,
    };
  }

  return null;
}

export function isDocumentTypeTemplateConfigured(
  config: DocumentTemplateConfig | null | undefined,
  tipo: DocumentTypeId,
): boolean {
  const entry = getDocumentTypeTemplateEntry(config, tipo);
  return Boolean(
    entry?.letterheadBasePdf?.url && entry?.pdfmeTemplate?.schemas?.length,
  );
}

export function mergeDocumentTypeTemplateEntry(
  config: DocumentTemplateConfig,
  tipo: DocumentTypeId,
  patch: DocumentTypeTemplateEntry,
): DocumentTemplateConfig {
  const current = config.templatesByType?.[tipo] ?? {};
  return {
    ...config,
    templatesByType: {
      ...config.templatesByType,
      [tipo]: { ...current, ...patch },
    },
  };
}

export function listConfiguredDocumentTypes(
  config: DocumentTemplateConfig | null | undefined,
): DocumentTypeId[] {
  const cfg = config ?? {};
  const configured = new Set<DocumentTypeId>();

  for (const tipo of DOCUMENT_TYPE_IDS) {
    const entry = cfg.templatesByType?.[tipo];
    if (
      entry?.letterheadBasePdf?.url &&
      entry?.pdfmeTemplate?.schemas?.length
    ) {
      configured.add(tipo);
    }
  }

  if (
    !configured.size &&
    cfg.letterheadBasePdf?.url &&
    cfg.pdfmeTemplate?.schemas?.length
  ) {
    return [...DOCUMENT_TYPE_IDS];
  }

  return Array.from(configured);
}
