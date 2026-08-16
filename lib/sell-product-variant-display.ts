/**
 * Materiale / Vetro-Telaio e stato listino per i prodotti in vendita.
 * Dopo l'import dei cataloghi 2026 esistono le colonne reali `cod_materiale` e
 * `cod_vetro_telaio`: quando presenti vengono usate direttamente (con etichetta
 * estesa). In fallback (prodotti storici senza codice) si ricava il valore
 * euristicamente da `name` / suffisso di `internal_code` / `tipo`.
 */

export interface SellProductVariantSource {
  name?: string | null;
  internal_code?: string | null;
  tipo?: string | null;
  product_type?: string | null;
  price_list?: boolean | null;
  cod_materiale?: string | null;
  cod_vetro_telaio?: string | null;
}

export const MATERIAL_CODE_LABELS: Record<string, string> = {
  // Serramenti
  LEG: "Legno",
  ALU: "Alluminio",
  PVC: "PVC",
  LEA: "Legno-alluminio",
  PAL: "PVC-alluminio",
  // Arredamento
  TRC: "Pannello truciolato nobilitato",
  MDF: "MDF laccato",
  IMP: "Pannello impiallacciato",
  MAS: "Legno massiccio",
  LAM: "Laminato/HPL",
};

export const GLASS_CODE_LABELS: Record<string, string> = {
  VC2: "Vetrocamera doppio",
  VC3: "Vetrocamera triplo",
  VSIC: "Vetro di sicurezza",
  VAC: "Vetro acustico",
  // Telai porte (rinnovo ago 2026)
  CAS: "Telaio a cassetta",
  BAI: "Telaio a baionetta",
  APP: "Telaio applicato",
  // Binari porte scorrevoli
  BINAPP: "Binario applicato",
  BINSOF: "Binario a soffitto",
  SCOMP: "A scomparsa",
};

function normalize(value?: string | null): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Codice materiale ricavato dal nome prodotto, oppure null. */
export function deriveMaterialCode(
  product: SellProductVariantSource,
): keyof typeof MATERIAL_CODE_LABELS | null {
  const name = normalize(product.name);
  if (!name) return null;

  const hasLegno = name.includes("legno");
  const hasAlluminio = name.includes("alluminio") || name.includes("allumin");
  const hasPvc = name.includes("pvc");

  if (hasLegno && hasAlluminio) return "LEA";
  if (hasPvc && hasAlluminio) return "PAL";
  if (hasAlluminio) return "ALU";
  if (hasPvc) return "PVC";
  if (hasLegno) return "LEG";
  return null;
}

/** Etichetta materiale leggibile, oppure null se non ricavabile. */
export function deriveMaterialLabel(
  product: SellProductVariantSource,
): string | null {
  const explicit = (product.cod_materiale || "").trim().toUpperCase();
  if (explicit) return MATERIAL_CODE_LABELS[explicit] ?? explicit;

  const code = deriveMaterialCode(product);
  return code ? MATERIAL_CODE_LABELS[code] : null;
}

function getCodeSuffix(internalCode?: string | null): string {
  const code = (internalCode || "").trim();
  if (!code) return "";
  const parts = code.split("-");
  return parts[parts.length - 1]?.toUpperCase() ?? "";
}

function isGlassTipo(tipo: string): boolean {
  return normalize(tipo).startsWith("vetro");
}

/**
 * Etichetta vetro/telaio ricavata dal suffisso di `internal_code`
 * (VC2/VC3/VSIC/VAC) o, in fallback, dal `tipo` quando descrive un vetro.
 */
export function deriveGlassLabel(
  product: SellProductVariantSource,
): string | null {
  const explicit = (product.cod_vetro_telaio || "").trim().toUpperCase();
  if (explicit) return GLASS_CODE_LABELS[explicit] ?? explicit;

  const suffix = getCodeSuffix(product.internal_code);
  if (suffix && GLASS_CODE_LABELS[suffix]) {
    return GLASS_CODE_LABELS[suffix];
  }

  const tipo = (product.tipo || product.product_type || "").trim();
  if (tipo && isGlassTipo(tipo)) return tipo;

  return null;
}

/** Etichetta variante = tipo (o product_type) normalizzato per il conteggio. */
export function getVariantLabel(
  product: SellProductVariantSource,
): string | null {
  const tipo = (product.tipo || product.product_type || "").trim();
  return tipo.length > 0 ? tipo : null;
}

export type PriceStatus = "empty" | "complete" | "partial" | "mostly-missing";

/** Stato listino di una sottocategoria/categoria in base ai prezzi mancanti. */
export function getPriceStatus(missing: number, total: number): PriceStatus {
  if (total <= 0) return "empty";
  if (missing <= 0) return "complete";
  if (missing / total > 0.5) return "mostly-missing";
  return "partial";
}

export function getPriceStatusBadgeVariant(
  status: PriceStatus,
): "success" | "warning" | "destructive" | "outline" {
  switch (status) {
    case "complete":
      return "success";
    case "partial":
      return "warning";
    case "mostly-missing":
      return "destructive";
    case "empty":
      return "outline";
  }
}

const SUMMARY_MAX_LABELS = 6;

function joinWithOverflow(labels: string[]): string {
  if (labels.length <= SUMMARY_MAX_LABELS) return labels.join(", ");
  const shown = labels.slice(0, SUMMARY_MAX_LABELS);
  const rest = labels.length - SUMMARY_MAX_LABELS;
  return `${shown.join(", ")} +${rest}`;
}

/**
 * Riepilogo testuale per la colonna Descrizione dell'albero: elenco materiali
 * disponibili; in mancanza di materiali ricavabili usa le varianti (tipo).
 */
export function formatSellCatalogSummary(
  materialLabels: string[],
  variantLabels: string[],
): string {
  if (materialLabels.length > 0) {
    return `Materiali: ${joinWithOverflow(materialLabels)}`;
  }
  if (variantLabels.length > 0) {
    return `Varianti: ${joinWithOverflow(variantLabels)}`;
  }
  return "—";
}
