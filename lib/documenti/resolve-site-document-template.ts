import {
  DEFAULT_DOCUMENT_TEMPLATE,
  mergeDocumentTemplate,
  type DocumentTemplate,
  type DocumentTemplateConfig,
} from "@/lib/documenti/template-types";
import { DEFAULT_DOCUMENT_PAGE_FORMAT } from "@/lib/documenti/page-format";

export interface SiteTemplateSource {
  name?: string | null;
  logo?: string | null;
  document_template_config?: DocumentTemplateConfig | null;
  organizationName?: string | null;
}

export interface DocumentTemplateIssue {
  field: string;
  label: string;
  blocking: boolean;
}

/** Completa la config con dati del sito/organizzazione quando mancanti. */
export function buildDocumentTemplateConfigFromSite(
  source: SiteTemplateSource,
): DocumentTemplateConfig {
  const stored = source.document_template_config ?? {};
  const ragioneSociale =
    stored.mittente?.ragioneSociale?.trim() ||
    source.name?.trim() ||
    source.organizationName?.trim() ||
    "";

  return {
    ...stored,
    mittente: {
      via: "",
      cap: "",
      citta: "",
      iva: "",
      ...stored.mittente,
      ragioneSociale,
    },
    banca: {
      nome: "",
      iban: "",
      ...stored.banca,
    },
    logoUrl: stored.logoUrl ?? source.logo ?? null,
  };
}

export function resolveSiteDocumentTemplate(
  source: SiteTemplateSource,
): DocumentTemplate {
  const config = buildDocumentTemplateConfigFromSite(source);
  const merged = mergeDocumentTemplate(config, source.logo ?? null);
  return {
    ...merged,
    pageFormat: DEFAULT_DOCUMENT_PAGE_FORMAT,
  };
}

export function getDocumentTemplateIssues(
  template: DocumentTemplate,
): DocumentTemplateIssue[] {
  const issues: DocumentTemplateIssue[] = [];

  if (!template.mittente.ragioneSociale.trim()) {
    issues.push({
      field: "mittente.ragioneSociale",
      label: "Ragione sociale mittente",
      blocking: true,
    });
  }
  if (!template.mittente.via.trim()) {
    issues.push({
      field: "mittente.via",
      label: "Indirizzo mittente",
      blocking: false,
    });
  }
  if (!template.mittente.iva.trim()) {
    issues.push({
      field: "mittente.iva",
      label: "Partita IVA",
      blocking: false,
    });
  }
  if (!template.banca.iban.trim()) {
    issues.push({
      field: "banca.iban",
      label: "IBAN",
      blocking: true,
    });
  }
  if (!template.banca.nome.trim()) {
    issues.push({
      field: "banca.nome",
      label: "Nome banca",
      blocking: false,
    });
  }

  return issues;
}

export function isDocumentTemplateConfigured(
  template: DocumentTemplate,
): boolean {
  return getDocumentTemplateIssues(template).every((issue) => !issue.blocking);
}

export function getDocumentTemplateMissingLabels(
  template: DocumentTemplate,
  options?: { blockingOnly?: boolean },
): string[] {
  const issues = getDocumentTemplateIssues(template);
  const filtered = options?.blockingOnly
    ? issues.filter((i) => i.blocking)
    : issues;
  return filtered.map((i) => i.label);
}
