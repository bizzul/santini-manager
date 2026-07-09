// Shared types & constants for the Momentum (Eventi) module.

export type ClienteTipo = "privato" | "azienda" | "ente";

export type FornitoreCategoria =
  | "location"
  | "artisti"
  | "food"
  | "beverage"
  | "materials"
  | "marketing"
  | "staff_security";

export type OffertaStato =
  | "richiesta"
  | "in_elaborazione"
  | "offerta_inviata"
  | "in_trattativa"
  | "vinta"
  | "persa";

export type CategoriaProdotto = "pvt_event" | "public_event" | "other";

export type TipoEvento = "pvt" | "public";

export type StatoPlan =
  | "to_plan"
  | "planning"
  | "planned"
  | "confirmed"
  | "live"
  | "finish";

export type StatoAccounting = "invoice_in" | "invoice_out" | "balance" | "close";

export type StatoIngaggio =
  | "da_contattare"
  | "in_trattativa"
  | "confermato"
  | "pagato";

export type TaskStato = "da_fare" | "in_corso" | "in_attesa_terzi" | "fatto";

export type FatturaDirezione = "in" | "out";
export type FatturaStato = "aperta" | "pagata" | "incassata" | "stornata";

export interface EvCliente {
  id: string;
  nome: string;
  tipo: ClienteTipo;
  email: string | null;
  telefono: string | null;
  note: string | null;
}

export interface EvLocation {
  id: string;
  nome: string;
  indirizzo: string | null;
  citta: string | null;
  capienza: number | null;
  note_logistiche: string | null;
  contatto_referente: string | null;
  telefono: string | null;
  lat: number | null;
  lng: number | null;
}

export interface EvFornitore {
  id: string;
  nome: string;
  categoria: FornitoreCategoria;
  email: string | null;
  telefono: string | null;
  note: string | null;
  costo_indicativo: number | null;
}

export interface EvOfferta {
  id: string;
  cliente_id: string | null;
  titolo: string;
  categoria_prodotto: CategoriaProdotto;
  stato: OffertaStato;
  data_evento_prevista: string | null;
  importo_offerto: number | null;
  note: string | null;
  evento_id: string | null;
  lat: number | null;
  lng: number | null;
  cliente?: EvCliente | null;
}

export interface EvEvento {
  id: string;
  offerta_id: string | null;
  cliente_id: string | null;
  location_id: string | null;
  titolo: string;
  tipo_evento: TipoEvento;
  categoria_prodotto: CategoriaProdotto;
  stato_plan: StatoPlan;
  stato_accounting: StatoAccounting | null;
  data_evento: string | null;
  ora_inizio: string | null;
  ora_fine: string | null;
  budget_previsto: number | null;
  ricavo_previsto: number | null;
  note: string | null;
  lat: number | null;
  lng: number | null;
  senza_data: boolean;
  volo_brandizzato: boolean;
  immagine_url: string | null;
  cliente?: EvCliente | null;
  location?: EvLocation | null;
}

export interface EvEventoFornitore {
  id: string;
  evento_id: string;
  fornitore_id: string;
  ruolo: string | null;
  stato_ingaggio: StatoIngaggio;
  costo: number | null;
  rider_ricevuto: boolean;
  fornitore?: EvFornitore | null;
}

export interface EvEventoTask {
  id: string;
  evento_id: string;
  titolo: string;
  stato: TaskStato;
  scadenza: string | null;
  assegnatario: string | null;
}

export interface EvFattura {
  id: string;
  evento_id: string | null;
  direzione: FatturaDirezione;
  descrizione: string | null;
  importo: number;
  stato: FatturaStato;
  data_scadenza: string | null;
}

export interface KanbanColumnDef {
  id: string;
  title: string;
  color: string;
}

export const OFFERTA_COLUMNS: KanbanColumnDef[] = [
  { id: "richiesta", title: "Richiesta", color: "#64748b" },
  { id: "in_elaborazione", title: "In elaborazione", color: "#0ea5e9" },
  { id: "offerta_inviata", title: "Offerta inviata", color: "#6366f1" },
  { id: "in_trattativa", title: "In trattativa", color: "#f59e0b" },
  { id: "vinta", title: "Vinta", color: "#16a34a" },
  { id: "persa", title: "Persa", color: "#dc2626" },
];

export const PLAN_COLUMNS: KanbanColumnDef[] = [
  { id: "to_plan", title: "To Plan", color: "#64748b" },
  { id: "planning", title: "Planning", color: "#0ea5e9" },
  { id: "planned", title: "Planned", color: "#6366f1" },
  { id: "confirmed", title: "Confirmed", color: "#16a34a" },
  { id: "live", title: "Live", color: "#a855f7" },
  { id: "finish", title: "Finish", color: "#0f766e" },
];

export const ACCOUNTING_COLUMNS: KanbanColumnDef[] = [
  { id: "invoice_in", title: "Invoice IN", color: "#f59e0b" },
  { id: "invoice_out", title: "Invoice OUT", color: "#0ea5e9" },
  { id: "balance", title: "Balance", color: "#6366f1" },
  { id: "close", title: "Close", color: "#16a34a" },
];

export const TASK_COLUMNS: KanbanColumnDef[] = [
  { id: "da_fare", title: "Da fare", color: "#64748b" },
  { id: "in_corso", title: "In corso", color: "#0ea5e9" },
  { id: "in_attesa_terzi", title: "In attesa terzi", color: "#f59e0b" },
  { id: "fatto", title: "Fatto", color: "#16a34a" },
];

export const CLIENTE_TIPO_LABEL: Record<ClienteTipo, string> = {
  privato: "Privato",
  azienda: "Azienda",
  ente: "Ente",
};

export const CATEGORIA_PRODOTTO_LABEL: Record<CategoriaProdotto, string> = {
  pvt_event: "Evento privato",
  public_event: "Evento pubblico",
  other: "Altro",
};

export const FORNITORE_CATEGORIA_LABEL: Record<FornitoreCategoria, string> = {
  location: "Location",
  artisti: "Artisti",
  food: "Food",
  beverage: "Beverage",
  materials: "Materiali",
  marketing: "Marketing",
  staff_security: "Staff & Security",
};

export const STATO_INGAGGIO_LABEL: Record<StatoIngaggio, string> = {
  da_contattare: "Da contattare",
  in_trattativa: "In trattativa",
  confermato: "Confermato",
  pagato: "Pagato",
};

export const TASK_STATO_LABEL: Record<TaskStato, string> = {
  da_fare: "Da fare",
  in_corso: "In corso",
  in_attesa_terzi: "In attesa terzi",
  fatto: "Fatto",
};

/** CHF currency formatter (Ticino). */
export function formatCHF(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("it-CH", {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Days from today to `date` (negative if past). Null when no date. */
export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatEUDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("it-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
