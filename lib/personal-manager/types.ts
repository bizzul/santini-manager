// Personal Manager (Wheel of Life) — tipi condivisi e tassonomia aree.

// ---------------------------------------------------------------------------
// Capability per-utente (il Manager Personale non e' uno spazio: e' un flag
// su un utente esistente).
// ---------------------------------------------------------------------------

export type UtenteGenere = "maschio" | "femmina" | "altro" | "non_specificato";

export type LandingPreferita = "auto" | "personale" | "ultimo_spazio";

export const GENERE_LABELS: Record<UtenteGenere, string> = {
  maschio: "Maschio",
  femmina: "Femmina",
  altro: "Altro",
  non_specificato: "Non specificato",
};

export const LANDING_PREFERITA_LABELS: Record<LandingPreferita, string> = {
  auto: "Automatica (mobile → personale)",
  personale: "Sempre personale",
  ultimo_spazio: "Sempre ultimo spazio",
};

export function isUtenteGenere(value: string): value is UtenteGenere {
  return value in GENERE_LABELS;
}

export function isLandingPreferita(value: string): value is LandingPreferita {
  return value in LANDING_PREFERITA_LABELS;
}

/** Utente con Manager Personale abilitato (colonna admin "I tuoi spazi"). */
export interface PersonalManagerUser {
  /** PK integer di public."User". */
  id: number;
  /** auth.users.id (uuid) — null se l'utente non ha ancora un login. */
  authId: string | null;
  email: string;
  givenName: string | null;
  familyName: string | null;
  initials: string | null;
  picture: string | null;
  genere: UtenteGenere;
  abilitatoAt: string | null;
}

/** Riga user-scoped della Wheel of Life (tabella aree_vita). */
export interface AreaVita {
  id: string;
  utente_id: string;
  slug: AreaSlug;
  nome: string;
  colore: string;
  punteggio: number | null;
  ordine: number;
  deleted_at: string | null;
  created_at: string;
}

export type AreaSlug =
  | "career"
  | "finance"
  | "family"
  | "health"
  | "fun"
  | "friends"
  | "growth"
  | "spiritual";

export type ItemStatus = "open" | "in_progress" | "done" | "postponed";

export type AutomationStato = "previsto" | "in_integrazione" | "attivo";

export type DataSourceType =
  | "internal"
  | "external"
  | "wearable"
  | "accounting"
  | "calendar"
  | "manual";

export type PermissionAction = "read" | "edit" | "create";

export interface AreaPermissions {
  read: boolean;
  edit: boolean;
  create: boolean;
}

/** Matrice permessi per-utente: { [area]: { read, edit, create } } */
export type PermissionsMatrix = Partial<Record<AreaSlug, AreaPermissions>>;

export interface PmAccess {
  id: string;
  site_id: string;
  user_id: string;
  beta_app_enabled: boolean;
  areas_visible: AreaSlug[];
  permissions: PermissionsMatrix;
  created_at: string;
  updated_at: string;
}

export interface PmLifeArea {
  id: string;
  site_id: string;
  slug: AreaSlug;
  label: string;
  accent_color: string;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PmAreaScore {
  id: string;
  site_id: string;
  user_id: string;
  area_slug: AreaSlug;
  score: number;
  recorded_at: string;
  created_at: string;
}

export interface PmItem {
  id: string;
  site_id: string;
  user_id: string;
  area_slug: AreaSlug;
  title: string;
  notes: string | null;
  priority: number;
  status: ItemStatus;
  due_date: string | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PmItemSnapshot {
  id: string;
  item_id: string;
  site_id: string;
  user_id: string;
  status: ItemStatus;
  priority: number;
  snapshot_at: string;
}

export interface PmAutomation {
  id: string;
  site_id: string;
  area_slug: AreaSlug | null;
  name: string;
  stato: AutomationStato;
  data_prevista: string | null;
  data_attivazione: string | null;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface PmDataSource {
  id: string;
  site_id: string;
  name: string;
  type: DataSourceType;
  area_slug: AreaSlug | null;
  sync_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/** Definizione statica della tassonomia Wheel of Life (fallback + UI). */
export interface LifeAreaDef {
  slug: AreaSlug;
  label: string;
  /** Accent color in HEX (dati-derivati -> usare inline style, non classi Tailwind). */
  accent: string;
  /** Tinta soft per superfici. */
  accentSoft: string;
  order: number;
}

export const LIFE_AREAS: LifeAreaDef[] = [
  { slug: "career", label: "Career", accent: "#F5921B", accentSoft: "rgba(245,146,27,0.14)", order: 1 },
  { slug: "finance", label: "Finance", accent: "#F2C218", accentSoft: "rgba(242,194,24,0.16)", order: 2 },
  { slug: "family", label: "Family", accent: "#57B947", accentSoft: "rgba(87,185,71,0.14)", order: 3 },
  { slug: "health", label: "Health", accent: "#2FBFA4", accentSoft: "rgba(47,191,164,0.14)", order: 4 },
  { slug: "fun", label: "Fun & Recreation", accent: "#39B7E4", accentSoft: "rgba(57,183,228,0.14)", order: 5 },
  { slug: "friends", label: "Friends", accent: "#6E77D8", accentSoft: "rgba(110,119,216,0.14)", order: 6 },
  { slug: "growth", label: "Personal Development", accent: "#B061D4", accentSoft: "rgba(176,97,212,0.14)", order: 7 },
  { slug: "spiritual", label: "Spiritual", accent: "#F0736A", accentSoft: "rgba(240,115,106,0.14)", order: 8 },
];

export const AREA_SLUGS: AreaSlug[] = LIFE_AREAS.map((a) => a.slug);

const AREA_MAP: Record<AreaSlug, LifeAreaDef> = LIFE_AREAS.reduce(
  (acc, area) => {
    acc[area.slug] = area;
    return acc;
  },
  {} as Record<AreaSlug, LifeAreaDef>,
);

export function getAreaDef(slug: string): LifeAreaDef | undefined {
  return AREA_MAP[slug as AreaSlug];
}

export function isAreaSlug(value: string): value is AreaSlug {
  return value in AREA_MAP;
}

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  open: "Aperto",
  in_progress: "In corso",
  done: "Completato",
  postponed: "Posticipato",
};

export const AUTOMATION_STATO_LABELS: Record<AutomationStato, string> = {
  previsto: "Previsto",
  in_integrazione: "In integrazione",
  attivo: "Attivo",
};

/** Default: tutte le aree visibili con permessi read/edit/create. */
export function defaultPermissionsMatrix(): PermissionsMatrix {
  return AREA_SLUGS.reduce((acc, slug) => {
    acc[slug] = { read: true, edit: true, create: true };
    return acc;
  }, {} as PermissionsMatrix);
}

/** Risolve i permessi effettivi di un'area a partire dal record pm_access. */
export function resolveAreaPermissions(
  access: Pick<PmAccess, "areas_visible" | "permissions"> | null,
  slug: AreaSlug,
): AreaPermissions {
  if (!access) return { read: false, edit: false, create: false };
  const visible = access.areas_visible?.includes(slug) ?? false;
  if (!visible) return { read: false, edit: false, create: false };
  const perms = access.permissions?.[slug];
  return {
    read: perms?.read ?? true,
    edit: perms?.edit ?? false,
    create: perms?.create ?? false,
  };
}
