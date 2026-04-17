export interface CommandDeckNodeSignal {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral" | "warning";
}

/**
 * Small floating notification bubble rendered above each node.
 * Tone drives the accent color of the count pill.
 */
export interface CommandDeckNotification {
  count: string; // string so we can show "12+" or "0" flexibly
  label: string; // short, translated noun ("attività", "richieste", …)
  tone?: "positive" | "negative" | "neutral" | "warning";
}

export interface CommandDeckNode {
  id: string;
  label: string;
  subtitle: string;
  description: string;
  /** HEX — used for 3D emissive, overlay accents and the notification cloud. */
  color: string;
  /** World-space position in the 3D scene. */
  position: [number, number, number];
  /** Demo notification shown as a floating cloud above the node. */
  notification: CommandDeckNotification;
  signals: CommandDeckNodeSignal[];
}

/**
 * V2.3 spatial layout — user-centric home:
 *
 *   Clienti       Progetti       Fabbrica
 *       \\           |           //
 *        Fornitori  USER   Prodotti
 *       /           |           \\
 *   Admin                       Inventario
 *
 * Each node is identified by its unique `id`. The actual 3D representation
 * is picked per-id in `NodeGlyph.tsx` (a small group of primitives), and
 * the navigation target is resolved centrally via `routes.ts`.
 */
export const COMMAND_DECK_NODES: CommandDeckNode[] = [
  // Top row
  {
    id: "clienti",
    label: "Clienti",
    subtitle: "Customer Network",
    description:
      "Anagrafica clienti, relazioni attive e segnali di coinvolgimento.",
    color: "#f0abfc", // fuchsia-300
    position: [-3.6, 1.8, -1.4],
    notification: { count: "2", label: "richieste", tone: "warning" },
    signals: [
      { label: "Clienti attivi", value: "214" },
      { label: "Nuovi nel mese", value: "9", tone: "positive" },
      { label: "Da ricontattare", value: "5", tone: "warning" },
    ],
  },
  {
    id: "progetti",
    label: "Progetti",
    subtitle: "Delivery Core",
    description:
      "Progetti in corso, avanzamento consegne, milestone e cantieri attivi.",
    color: "#a5b4fc", // indigo-300
    position: [0, 2.5, -2.4],
    notification: { count: "4", label: "aperti" },
    signals: [
      { label: "Progetti attivi", value: "28" },
      { label: "Milestone a rischio", value: "3", tone: "negative" },
      { label: "Consegne settimana", value: "11", tone: "positive" },
    ],
  },
  {
    id: "fabbrica",
    label: "Fabbrica",
    subtitle: "Factory Floor",
    description:
      "Reparti produttivi, carico macchine e stato operativo della fabbrica.",
    color: "#fca5a5", // red-300
    position: [3.6, 1.8, -1.4],
    notification: { count: "3", label: "attività" },
    signals: [
      { label: "Ordini in lavorazione", value: "46" },
      { label: "Reparti saturi", value: "2", tone: "warning" },
      { label: "OEE stimato", value: "82%", tone: "positive" },
    ],
  },

  // Middle row (sides)
  {
    id: "fornitori",
    label: "Fornitori",
    subtitle: "Supply Network",
    description:
      "Rete fornitori, ordini in arrivo, stato consegne e rating partner.",
    color: "#fde68a", // amber-200
    position: [-4.6, 0.0, 0.4],
    notification: { count: "1", label: "ordine" },
    signals: [
      { label: "Fornitori attivi", value: "58" },
      { label: "Ordini in transito", value: "14" },
      { label: "Ritardi", value: "2", tone: "warning" },
    ],
  },
  {
    id: "prodotti",
    label: "Prodotti",
    subtitle: "Catalog & SKU",
    description:
      "Catalogo prodotti di vendita, categorie e composizione distinte base.",
    color: "#67e8f9", // cyan-300
    position: [4.6, 0.0, 0.4],
    notification: { count: "12", label: "articoli" },
    signals: [
      { label: "SKU attivi", value: "1.124" },
      { label: "Nuovi questo mese", value: "18", tone: "positive" },
      { label: "Fuori catalogo", value: "6", tone: "neutral" },
    ],
  },

  // Bottom row
  {
    id: "admin",
    label: "Admin",
    subtitle: "Control Plane",
    description:
      "Collaboratori, ruoli e permessi del workspace. Controllo accessi.",
    color: "#6ee7b7", // emerald-300
    position: [-3.2, -1.8, 1.9],
    notification: { count: "1", label: "update" },
    signals: [
      { label: "Utenti attivi", value: "26" },
      { label: "Permessi personalizzati", value: "11" },
      { label: "Alert sicurezza", value: "0", tone: "positive" },
    ],
  },
  {
    id: "inventario",
    label: "Inventario",
    subtitle: "Material Flow",
    description:
      "Magazzini, scorte e rifornimenti. Materiali critici sotto soglia.",
    color: "#c4b5fd", // violet-300
    position: [3.2, -1.8, 1.9],
    notification: { count: "2", label: "alert", tone: "negative" },
    signals: [
      { label: "Articoli tracciati", value: "1.842" },
      { label: "Sotto scorta", value: "7", tone: "warning" },
      { label: "Ordini fornitori", value: "12" },
    ],
  },
];

/** Virtual id for the central user node (no entry in COMMAND_DECK_NODES). */
export const USER_NODE_ID = "__user__";

/** World-space position of the user node (shared with Connections). */
export const USER_NODE_POSITION: [number, number, number] = [0, 0, 0];
