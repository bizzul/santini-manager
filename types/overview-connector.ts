/**
 * Tipi strict per la Overview Connector (spazio Matris).
 *
 * Rispecchiano lo schema di supabase/migrations/20260712000000_overview_connector.sql.
 * Nessun `any`: sono la fonte di verita' TypeScript finche' non e' possibile
 * rigenerare i tipi con `supabase gen types typescript`.
 */

export type AttivitaSpazio = "azienda" | "privato";
export type AttivitaStato = "todo" | "doing" | "finish";
export type Semaforo = "verde" | "giallo" | "rosso";

/** Filtro spazio selezionabile nell'header (URL searchParam `spazio`). */
export type SpazioFilter = "tutto" | AttivitaSpazio;

/** Riga della view `v_attivita_board`: attivita + giorni_fermo (SQL) + relazioni. */
export interface AttivitaBoardRow {
  id: string;
  site_id: string;
  codice: string;
  titolo: string;
  spazio: AttivitaSpazio;
  stato: AttivitaStato;
  sotto_stato: string | null;
  data_stato: string;
  note: string | null;
  ambito_id: string;
  ambito_nome: string;
  ambito_colore: string;
  progetto_id: string | null;
  /** Calcolato in SQL da data_stato: mai ricalcolato nel client. */
  giorni_fermo: number;
  progetti: string[];
  aziende: string[];
  persone: string[];
}

/** Riga delle view `v_carico_aziende` / `v_carico_persone`. */
export interface CaricoRow {
  id: string;
  site_id: string;
  nome: string;
  todo: number;
  doing: number;
  attive: number;
}

/** Riga della view `v_kanban_counts` (contenitori fisici / display ESP32). */
export interface KanbanCountRow {
  site_id: string;
  stato: AttivitaStato;
  card_dentro: number;
  wip_limite: number;
  giorni_fermo_max: number;
  semaforo: Semaforo;
}

/** Riga della tabella `wip_limits`. */
export interface WipLimitRow {
  site_id: string;
  stato: AttivitaStato;
  limite: number;
  soglia_stagnazione_giorni: number;
}

/** Conteggio per una cella della matrice Ambito x Stato. */
export interface AmbitoStatoCell {
  todo: number;
  doing: number;
  finish: number;
}

/** Riga della matrice: un ambito con i suoi conteggi per stato. */
export interface AmbitoStatoRow extends AmbitoStatoCell {
  ambito_nome: string;
  ambito_colore: string;
}

/** KPI in cima alla dashboard. */
export interface OverviewKpi {
  attive: number;
  stagnanti: number;
  saturazioneWipDoingPct: number;
  giorniFermoMax: number;
  doingCount: number;
  doingLimite: number;
}

/** Filtri attivi, letti dagli URL searchParams. */
export interface OverviewFilters {
  spazio: SpazioFilter;
  ambito: string | null;
  stato: AttivitaStato | null;
  azienda: string | null;
  persona: string | null;
}

/** Colonna Kanban pronta per il rendering. */
export interface BoardColumn {
  stato: AttivitaStato;
  label: string;
  cards: AttivitaBoardRow[];
  count: number;
  limite: number;
  soglia: number;
  saturazionePct: number;
}

/** Payload completo passato dai Server Components ai Client Components. */
export interface OverviewData {
  siteId: string;
  domain: string;
  filters: OverviewFilters;
  columns: BoardColumn[];
  kpi: OverviewKpi;
  matrix: AmbitoStatoRow[];
  matrixTotals: AmbitoStatoCell;
  caricoAziende: CaricoRow[];
  caricoPersone: CaricoRow[];
  kanbanCounts: KanbanCountRow[];
  wipLimits: WipLimitRow[];
}

export const STATI: AttivitaStato[] = ["todo", "doing", "finish"];

export const STATO_LABEL: Record<AttivitaStato, string> = {
  todo: "ToDo",
  doing: "Doing",
  finish: "Finish",
};

/** Colori intestazione colonna (data-driven, da usare via style inline). */
export const STATO_COLORE: Record<AttivitaStato, string> = {
  todo: "#E06666",
  doing: "#E9E987",
  finish: "#93C47D",
};
