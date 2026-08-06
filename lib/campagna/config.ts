/**
 * Shared constants and types for the electoral campaign vertical.
 *
 * These sites (Campagna 2027, Fabio Kaeppeli) are flagged via `sites.site_type`
 * so the whole UI can branch on a single, well-typed switch instead of
 * scattering hardcoded UUID checks around the codebase.
 */

export const SITE_TYPE_CAMPAGNA = "campagna_elettorale" as const;
export const SITE_TYPE_AZIENDA = "azienda" as const;

export type SiteType = typeof SITE_TYPE_AZIENDA | typeof SITE_TYPE_CAMPAGNA;

export function isCampagnaElettorale(
  siteType: string | null | undefined,
): boolean {
  return siteType === SITE_TYPE_CAMPAGNA;
}

// Campaign module names already seeded in `site_modules` for both sites.
export const CAMPAGNA_MODULES = [
  "campagna_crm",
  "campagna_contenuti",
  "campagna_calendario",
  "campagna_analisi",
] as const;

export type CampagnaModule = (typeof CAMPAGNA_MODULES)[number];

// ---- Domain enums (mirror the DB check constraints) ----

export const CONTATTO_TIPI = [
  "elettore",
  "volontario",
  "donatore",
  "simpatizzante",
] as const;
export type ContattoTipo = (typeof CONTATTO_TIPI)[number];

export const CONSENSO_STATI = [
  "richiesto",
  "concesso",
  "negato",
  "revocato",
] as const;
export type ConsensoStato = (typeof CONSENSO_STATI)[number];

export const CONSENSO_BASI_LEGALI = [
  "consenso_esplicito",
  "interesse_legittimo",
  "obbligo_legale",
] as const;
export type ConsensoBaseLegale = (typeof CONSENSO_BASI_LEGALI)[number];

export const INTERAZIONE_TIPI = [
  "porta_a_porta",
  "chiamata",
  "evento",
  "email",
  "altro",
] as const;
export type InterazioneTipo = (typeof INTERAZIONE_TIPI)[number];

export const EVENTO_TIPI = [
  "comizio",
  "porta_a_porta",
  "scadenza_legale",
  "pubblicazione",
  "altro",
] as const;
export type EventoTipo = (typeof EVENTO_TIPI)[number];

export const EVENTO_STATI = [
  "pianificato",
  "confermato",
  "svolto",
  "annullato",
] as const;
export type EventoStato = (typeof EVENTO_STATI)[number];

export const CONTENUTO_FORMATI = [
  "post_social",
  "comunicato",
  "grafica",
] as const;
export type ContenutoFormato = (typeof CONTENUTO_FORMATI)[number];

export const CONTENUTO_STATI = [
  "bozza",
  "revisione",
  "approvato",
  "pubblicato",
] as const;
export type ContenutoStato = (typeof CONTENUTO_STATI)[number];

// ---- Row shapes (subset used by the UI) ----

export interface CampagnaContatto {
  id: string;
  site_id: string;
  nome: string;
  cognome: string | null;
  comune: string | null;
  email: string | null;
  telefono: string | null;
  tipo: ContattoTipo;
  fonte: string | null;
  note: string | null;
  consenso_stato: ConsensoStato;
  consenso_base_legale: ConsensoBaseLegale;
  consenso_data: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CampagnaInterazione {
  id: string;
  site_id: string;
  contatto_id: string;
  tipo: InterazioneTipo;
  note: string | null;
  data: string;
  registrato_da: string | null;
  created_at: string;
}

export interface CampagnaEvento {
  id: string;
  site_id: string;
  titolo: string;
  tipo: EventoTipo;
  data_inizio: string;
  data_fine: string | null;
  luogo: string | null;
  comune: string | null;
  stato: EventoStato;
  deleted_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CampagnaContenuto {
  id: string;
  site_id: string;
  titolo: string;
  formato: ContenutoFormato;
  stato: ContenutoStato;
  corpo_testo: string | null;
  canale: string | null;
  data_pubblicazione_prevista: string | null;
  autore_id: string | null;
  approvato_da: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string | null;
}

// Human-friendly labels (Italian) for enums used across the campaign UI.
export const CONTATTO_TIPO_LABELS: Record<ContattoTipo, string> = {
  elettore: "Elettore",
  volontario: "Volontario",
  donatore: "Donatore",
  simpatizzante: "Simpatizzante",
};

export const CONSENSO_STATO_LABELS: Record<ConsensoStato, string> = {
  richiesto: "Richiesto",
  concesso: "Concesso",
  negato: "Negato",
  revocato: "Revocato",
};

export const CONSENSO_BASE_LEGALE_LABELS: Record<ConsensoBaseLegale, string> = {
  consenso_esplicito: "Consenso esplicito",
  interesse_legittimo: "Interesse legittimo",
  obbligo_legale: "Obbligo legale",
};

export const INTERAZIONE_TIPO_LABELS: Record<InterazioneTipo, string> = {
  porta_a_porta: "Porta a porta",
  chiamata: "Chiamata",
  evento: "Evento",
  email: "Email",
  altro: "Altro",
};

export const EVENTO_TIPO_LABELS: Record<EventoTipo, string> = {
  comizio: "Comizio",
  porta_a_porta: "Porta a porta",
  scadenza_legale: "Scadenza legale",
  pubblicazione: "Pubblicazione",
  altro: "Altro",
};

export const EVENTO_STATO_LABELS: Record<EventoStato, string> = {
  pianificato: "Pianificato",
  confermato: "Confermato",
  svolto: "Svolto",
  annullato: "Annullato",
};

export const CONTENUTO_FORMATO_LABELS: Record<ContenutoFormato, string> = {
  post_social: "Post social",
  comunicato: "Comunicato",
  grafica: "Grafica",
};

export const CONTENUTO_STATO_LABELS: Record<ContenutoStato, string> = {
  bozza: "Bozza",
  revisione: "Revisione",
  approvato: "Approvato",
  pubblicato: "Pubblicato",
};

// Ticino map default view (used by the campaign dashboard map).
export const TICINO_MAP_CENTER = { lat: 46.19, lng: 8.92 } as const;
export const TICINO_MAP_ZOOM = 10;
