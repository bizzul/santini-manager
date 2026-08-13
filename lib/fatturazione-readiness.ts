import { DASHBOARD_STATUS_TONE } from "@/lib/dashboard-status-tones";

export const FATTURAZIONE_READINESS_STATI = ["in_attesa", "pronto"] as const;

export type FatturazioneReadinessStato =
  (typeof FATTURAZIONE_READINESS_STATI)[number];

export type FatturazioneReadiness = {
  id: string;
  site_id: string;
  task_id: number;
  stato: FatturazioneReadinessStato;
  uguale_offerta: boolean;
  confermato_at: string | null;
  confermato_by: string | null;
};

export type FatturazioneSupplementoRiga = {
  id: string;
  site_id: string;
  task_id: number;
  descrizione: string;
  quantita: number;
  prezzo: number;
  catalog_supplemento_id?: string | null;
  created_by: string | null;
  created_at: string;
};

export type FatturazioneCatalogSupplemento = {
  id: string;
  codice: string;
  nome: string;
  valore: number;
  tipo_calcolo: string;
};

export type FatturazioneKanbanLike = {
  is_invoicing_kanban?: boolean | null;
  identifier?: string | null;
  category?: { identifier?: string | null } | null;
  categoryIdentifier?: string | null;
} | null;

export type FatturazioneColumnLike = {
  position?: number | null;
  identifier?: string | null;
  title?: string | null;
} | null;

export function isFatturazioneKanban(
  kanban?: FatturazioneKanbanLike,
  column?: FatturazioneColumnLike,
): boolean {
  if (kanban?.is_invoicing_kanban) return true;

  const kanbanIdentifier = (kanban?.identifier || "").toLowerCase();
  const categoryIdentifier = (
    kanban?.category?.identifier ||
    kanban?.categoryIdentifier ||
    ""
  ).toLowerCase();
  const columnIdentifier = (column?.identifier || "").toLowerCase();

  return (
    kanbanIdentifier === "fatture" ||
    categoryIdentifier === "fatturazione" ||
    /_fatture$/.test(columnIdentifier)
  );
}

export function isFatturazioneToDoColumn(
  column?: FatturazioneColumnLike,
): boolean {
  if (!column) return false;
  const identifier = (column.identifier || "").toLowerCase();
  const title = (column.title || "").toLowerCase();
  if (
    identifier.includes("to_do") ||
    identifier.includes("todo") ||
    identifier.endsWith("_fatture") && identifier.startsWith("to_do")
  ) {
    return true;
  }
  if (
    title.includes("to do") ||
    title === "todo" ||
    title.includes("zu erledigen")
  ) {
    return true;
  }
  return Number(column.position) === 1;
}

export function isFatturazionePagataColumn(
  column?: FatturazioneColumnLike,
): boolean {
  if (!column) return false;
  const identifier = (column.identifier || "").toLowerCase();
  const title = (column.title || "").toLowerCase();
  if (identifier.includes("pagat") || title.includes("pagat")) return true;
  if (title.includes("bezahlt")) return true;
  return Number(column.position) === 3;
}

export function shouldShowFatturazioneReadinessBadge(
  kanban?: FatturazioneKanbanLike,
  column?: FatturazioneColumnLike,
): boolean {
  return (
    isFatturazioneKanban(kanban, column) && isFatturazioneToDoColumn(column)
  );
}

export function canConfirmFatturazioneReadiness(input: {
  ugualeOfferta: boolean;
  supplementiCount: number;
}): boolean {
  if (input.ugualeOfferta) return true;
  return Number(input.supplementiCount) > 0;
}

export function resolveFatturazioneReadinessStato(
  readiness?: { stato?: string | null } | null,
): FatturazioneReadinessStato {
  return readiness?.stato === "pronto" ? "pronto" : "in_attesa";
}

export function getFatturazioneReadinessFillClass(
  stato: FatturazioneReadinessStato,
): string {
  return "text-white";
}

export function getFatturazioneReadinessFillStyle(
  stato: FatturazioneReadinessStato,
): { backgroundColor: string; borderColor: string } {
  return stato === "pronto"
    ? DASHBOARD_STATUS_TONE.green
    : DASHBOARD_STATUS_TONE.orange;
}

export function getFatturazioneReadinessBorderColor(
  stato: FatturazioneReadinessStato,
): string {
  return getFatturazioneReadinessFillStyle(stato).borderColor;
}

function fatturazioneErrorText(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const maybeError = error as {
    code?: string | null;
    message?: string | null;
    details?: string | null;
    hint?: string | null;
  };
  return `${maybeError.code || ""} ${maybeError.message || ""} ${maybeError.details || ""} ${maybeError.hint || ""}`.toLowerCase();
}

/** True when PostgREST/Postgres does not yet have fatturazione tables or is_invoicing_kanban. */
export function isFatturazioneSchemaMissing(error: unknown): boolean {
  const text = fatturazioneErrorText(error);
  if (!text.trim()) return false;
  return (
    text.includes("fatturazione_readiness") ||
    text.includes("fatturazione_supplemento") ||
    text.includes("is_invoicing_kanban") ||
    text.includes("catalog_supplemento_id")
  );
}
