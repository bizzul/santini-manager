/** Re-export dal catalogo centralizzato (retrocompatibilità). */
export {
  buildTemplateFromCatalog,
  createDefaultPdfmeTemplate,
  hasPdfmeOverlay,
  resolvePdfmeTemplateForRender,
  validateTemplateFields,
  presetLabel,
  variantFromPreset,
  type PdfmeTemplateVariant,
  type LetterheadTemplateVariant,
  type LetterheadLayoutPreset,
  type LetterheadFieldId,
} from "@/lib/documenti/letterhead-field-catalog";
