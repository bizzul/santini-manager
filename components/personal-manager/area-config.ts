import type { AreaSlug } from "@/lib/personal-manager/types";

export interface AreaHubConfig {
  /** Scopo sintetico mostrato sotto l'header. */
  purpose: string;
  /** Etichetta del CTA principale di creazione item. */
  createLabel: string;
  /** Widget riepilogativi (titolo + descrizione statica del dato aggregato). */
  widgets: { title: string; hint: string }[];
  /** Aree correlate (chip cross-area). */
  correlations: AreaSlug[];
}

/**
 * Configurazione per-area dell'hub (B1-B8). Un solo componente <AreaHub>
 * rende tutte le aree usando questa mappa: niente 8 pagine duplicate.
 */
export const AREA_HUB_CONFIG: Record<AreaSlug, AreaHubConfig> = {
  career: {
    purpose: "Stato professionale, obiettivi, progetti e milestone.",
    createLabel: "Aggiungi obiettivo",
    widgets: [
      { title: "Obiettivi attivi", hint: "Traguardi professionali in corso" },
      { title: "Progetti / clienti", hint: "Milestone e scadenze chiave" },
    ],
    correlations: ["finance", "growth"],
  },
  finance: {
    purpose: "Quadro finanziario: entrate, uscite ricorrenti, risparmio.",
    createLabel: "Aggiungi voce",
    widgets: [
      { title: "Obiettivi di risparmio", hint: "Target aggregati, nessun dato sensibile" },
      { title: "Trend mensile", hint: "Andamento entrate/uscite" },
    ],
    correlations: ["career", "family"],
  },
  family: {
    purpose: "Persone, ricorrenze, impegni familiari e promemoria.",
    createLabel: "Aggiungi ricorrenza",
    widgets: [
      { title: "Ricorrenze", hint: "Compleanni e anniversari" },
      { title: "Impegni", hint: "Promemoria familiari" },
    ],
    correlations: ["health", "fun"],
  },
  health: {
    purpose: "Metriche di benessere, appuntamenti e abitudini. Solo tracciamento.",
    createLabel: "Aggiungi metrica",
    widgets: [
      { title: "Abitudini", hint: "Routine di benessere" },
      { title: "Appuntamenti", hint: "Visite e controlli" },
    ],
    correlations: ["fun", "spiritual"],
  },
  fun: {
    purpose: "Hobby, uscite, viaggi e tempo libero.",
    createLabel: "Pianifica attivita'",
    widgets: [
      { title: "In programma", hint: "Attivita' pianificate" },
      { title: "Wishlist", hint: "Esperienze da provare" },
    ],
    correlations: ["friends", "health"],
  },
  friends: {
    purpose: "Rete di relazioni, cadenza contatti ed eventi sociali.",
    createLabel: "Aggiungi contatto",
    widgets: [
      { title: "Da risentire", hint: "Cadenza contatti" },
      { title: "Eventi sociali", hint: "Prossimi incontri" },
    ],
    correlations: ["fun", "family"],
  },
  growth: {
    purpose: "Apprendimento, libri/corsi, skill e abitudini di crescita.",
    createLabel: "Aggiungi obiettivo",
    widgets: [
      { title: "In apprendimento", hint: "Libri e corsi attivi" },
      { title: "Abitudini", hint: "Tracker di crescita" },
    ],
    correlations: ["career", "spiritual"],
  },
  spiritual: {
    purpose: "Pratiche, valori, riflessioni e mindfulness.",
    createLabel: "Aggiungi riflessione",
    widgets: [
      { title: "Pratiche", hint: "Tracker mindfulness" },
      { title: "Intenzioni", hint: "Valori e propositi" },
    ],
    correlations: ["growth", "health"],
  },
};
