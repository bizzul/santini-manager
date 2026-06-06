import {
  getDocumentDestinatarioLabel,
  getDocumentTypeLabel,
} from "@/lib/documenti/document-types";
import type {
  ReferenceDocument,
  TemplateStructureMap,
} from "@/lib/documenti/template-structure-types";

export interface MittenteTemplate {
  ragioneSociale: string;
  via: string;
  cap: string;
  citta: string;
  iva: string;
}

export interface BancaTemplate {
  nome: string;
  iban: string;
}

export interface ColoriTemplate {
  primario?: string;
  secondario?: string;
  testo?: string;
}

export interface DocumentTemplateConfig {
  mittente?: Partial<MittenteTemplate>;
  banca?: Partial<BancaTemplate>;
  logoUrl?: string | null;
  logoPath?: string | null;
  colori?: ColoriTemplate;
  condizioniDefault?: string[];
  termineFornituraDefault?: string | null;
  templateModelText?: string | null;
  referenceDocument?: ReferenceDocument | null;
  structureMap?: TemplateStructureMap | null;
  structureAnalyzedAt?: string | null;
}

export interface DocumentTemplate {
  mittente: MittenteTemplate;
  banca: BancaTemplate;
  logoUrl: string | null;
  logoPath: string | null;
  colori: ColoriTemplate;
  condizioniDefault: string[];
  termineFornituraDefault: string | null;
  templateModelText: string | null;
  referenceDocument: ReferenceDocument | null;
  structureMap: TemplateStructureMap | null;
  structureAnalyzedAt: string | null;
}

export const DEFAULT_MATRIS_TEMPLATE: DocumentTemplate = {
  mittente: {
    ragioneSociale: "Matris pro SA",
    via: "Via Parco 4",
    cap: "6500",
    citta: "Bellinzona",
    iva: "CHE-312.965.779",
  },
  banca: {
    nome: "Banca Raiffeisen Lugano",
    iban: "CH81 8080 8007 2268 3378 1",
  },
  logoUrl: null,
  logoPath: null,
  templateModelText: null,
  referenceDocument: null,
  structureMap: null,
  structureAnalyzedAt: null,
  colori: {
    primario: "#1e3a5f",
    secondario: "#64748b",
    testo: "#0f172a",
  },
  condizioniDefault: ["- 50% all'ordine", "- saldo: 10 giorni netto"],
  termineFornituraDefault:
    "- 3-4 settimane dalla conferma d'ordine",
};

export function getTipoDocumentoLabel(tipo: string): string {
  return getDocumentTypeLabel(tipo);
}

export function getDestinatarioLabel(tipo: string): string {
  return getDocumentDestinatarioLabel(tipo);
}

export function mergeDocumentTemplate(
  config: DocumentTemplateConfig | null | undefined,
  siteLogo?: string | null,
): DocumentTemplate {
  const base = DEFAULT_MATRIS_TEMPLATE;
  const cfg = config ?? {};

  return {
    mittente: {
      ragioneSociale:
        cfg.mittente?.ragioneSociale ?? base.mittente.ragioneSociale,
      via: cfg.mittente?.via ?? base.mittente.via,
      cap: cfg.mittente?.cap ?? base.mittente.cap,
      citta: cfg.mittente?.citta ?? base.mittente.citta,
      iva: cfg.mittente?.iva ?? base.mittente.iva,
    },
    banca: {
      nome: cfg.banca?.nome ?? base.banca.nome,
      iban: cfg.banca?.iban ?? base.banca.iban,
    },
    logoUrl: cfg.logoUrl ?? siteLogo ?? base.logoUrl,
    logoPath: cfg.logoPath ?? base.logoPath,
    templateModelText: cfg.templateModelText ?? base.templateModelText,
    referenceDocument: cfg.referenceDocument ?? base.referenceDocument,
    structureMap: cfg.structureMap ?? base.structureMap,
    structureAnalyzedAt: cfg.structureAnalyzedAt ?? base.structureAnalyzedAt,
    colori: {
      primario: cfg.colori?.primario ?? base.colori.primario,
      secondario: cfg.colori?.secondario ?? base.colori.secondario,
      testo: cfg.colori?.testo ?? base.colori.testo,
    },
    condizioniDefault:
      cfg.condizioniDefault?.length
        ? cfg.condizioniDefault
        : base.condizioniDefault,
    termineFornituraDefault:
      cfg.termineFornituraDefault ?? base.termineFornituraDefault,
  };
}
