export const DASHBOARD_SETTINGS_KEY = "dashboard_experience_config";

export type DashboardExperienceQuestionCategory =
  | "business"
  | "visual"
  | "workflow"
  | "data"
  | "personal";

export type DashboardExperienceQuestion = {
  id: string;
  category: DashboardExperienceQuestionCategory;
  prompt: string;
  options: string[];
};

export type DashboardExperienceDashboard = {
  id: string;
  name: string;
  description: string;
};

export type DashboardExperienceUserSequence = {
  userId: string;
  questionIds: string[];
};

export type DashboardExperienceSettings = {
  activeDashboardIds: string[];
  userSequences: Record<string, string[]>;
};

export const DASHBOARD_EXPERIENCE_DASHBOARDS: DashboardExperienceDashboard[] = [
  {
    id: "overview",
    name: "Overview",
    description: "Vista generale con KPI principali e stato aziendale.",
  },
  {
    id: "forecast",
    name: "Forecast",
    description: "Previsioni, pipeline e segnali anticipati.",
  },
  {
    id: "vendita",
    name: "Vendita",
    description: "Offerte, clienti caldi, follow-up e conversioni.",
  },
  {
    id: "avor",
    name: "AVOR",
    description: "Preparazione lavoro, carico operativo e priorita.",
  },
  {
    id: "produzione",
    name: "Produzione",
    description: "Reparti, ritardi, avanzamento e capacita.",
  },
  {
    id: "fatturazione",
    name: "Fatturazione",
    description: "Fatture aperte, scadenze e importi da incassare.",
  },
  {
    id: "interni",
    name: "Interni",
    description: "Ore interne, attivita non fatturabili e controllo team.",
  },
  {
    id: "inventario",
    name: "Inventario",
    description: "Materiali, stock, valore e alert di magazzino.",
  },
  {
    id: "prodotti",
    name: "Prodotti",
    description: "Catalogo, categorie, resa commerciale e rivendita.",
  },
  {
    id: "my-dashboard",
    name: "My 1° Dashboard",
    description: "Esperienza personale guidata da domande e asset immersivi.",
  },
];

export const DASHBOARD_EXPERIENCE_QUESTIONS: DashboardExperienceQuestion[] = [
  { id: "q001", category: "business", prompt: "Qual e il tuo obiettivo principale oggi?", options: ["Vendere", "Produrre", "Controllare", "Pianificare"] },
  { id: "q002", category: "business", prompt: "Quale numero vuoi vedere per primo?", options: ["Fatturato", "Margine", "Ritardi", "Carico"] },
  { id: "q003", category: "business", prompt: "Quale area ti preoccupa di piu?", options: ["Offerte", "Produzione", "Incassi", "Magazzino"] },
  { id: "q004", category: "business", prompt: "Quanto spesso guardi la dashboard?", options: ["Ogni ora", "Ogni giorno", "Ogni settimana", "Solo riunioni"] },
  { id: "q005", category: "business", prompt: "Preferisci decidere da KPI o da lista attivita?", options: ["KPI", "Lista", "Mappa", "Timeline"] },
  { id: "q006", category: "business", prompt: "Quale decisione vuoi prendere piu velocemente?", options: ["Chi chiamare", "Cosa produrre", "Cosa fatturare", "Cosa comprare"] },
  { id: "q007", category: "business", prompt: "Quale processo deve essere piu visibile?", options: ["Offerta", "Ordine", "Produzione", "Consegna"] },
  { id: "q008", category: "business", prompt: "Quale rischio vuoi intercettare prima?", options: ["Ritardo", "Costo", "Cliente fermo", "Materiale mancante"] },
  { id: "q009", category: "business", prompt: "Quale metrica deve avere un alert forte?", options: ["Scadenza", "Margine basso", "Ritardo", "Stock basso"] },
  { id: "q010", category: "business", prompt: "La dashboard deve aiutarti piu a vendere o gestire?", options: ["Vendere", "Gestire", "Entrambi", "Dipende dal ruolo"] },
  { id: "q011", category: "visual", prompt: "Che stile visivo preferisci?", options: ["Pulito", "Premium", "Tecnico", "Videogioco"] },
  { id: "q012", category: "visual", prompt: "Quale colore vuoi dominante?", options: ["Blu", "Verde", "Ambra", "Neutro"] },
  { id: "q013", category: "visual", prompt: "Quanto contrasto vuoi?", options: ["Basso", "Medio", "Alto", "Molto alto"] },
  { id: "q014", category: "visual", prompt: "Preferisci card grandi o tabelle compatte?", options: ["Card grandi", "Tabelle", "Misto", "Dipende"] },
  { id: "q015", category: "visual", prompt: "La pagina deve sembrare piu cockpit o report?", options: ["Cockpit", "Report", "Showroom", "Officina"] },
  { id: "q016", category: "visual", prompt: "Quanto movimento vuoi?", options: ["Nessuno", "Leggero", "Medio", "Arcade"] },
  { id: "q017", category: "visual", prompt: "Preferisci icone, numeri o grafici?", options: ["Icone", "Numeri", "Grafici", "Tutti"] },
  { id: "q018", category: "visual", prompt: "Che densita informativa vuoi?", options: ["Minima", "Bilanciata", "Ricca", "Massima"] },
  { id: "q019", category: "visual", prompt: "Vuoi una mappa sempre visibile?", options: ["Si", "No", "Solo cantieri", "Solo clienti"] },
  { id: "q020", category: "visual", prompt: "Vuoi oggetti 3D nella dashboard?", options: ["Si", "No", "Solo start", "Solo hover"] },
  { id: "q021", category: "workflow", prompt: "Qual e la prima azione della giornata?", options: ["Controllare offerte", "Pianificare lavori", "Verificare ritardi", "Guardare incassi"] },
  { id: "q022", category: "workflow", prompt: "Chi deve usare questa dashboard?", options: ["Titolare", "Commerciale", "Produzione", "Amministrazione"] },
  { id: "q023", category: "workflow", prompt: "Vuoi una vista diversa per ogni ruolo?", options: ["Si", "No", "Solo admin", "Solo produzione"] },
  { id: "q024", category: "workflow", prompt: "La dashboard deve suggerire azioni?", options: ["Si", "No", "Solo alert", "Solo priorita"] },
  { id: "q025", category: "workflow", prompt: "Quale lista vuoi aprire piu spesso?", options: ["Clienti", "Offerte", "Progetti", "Fornitori"] },
  { id: "q026", category: "workflow", prompt: "Quale filtro deve essere subito pronto?", options: ["Oggi", "Questa settimana", "In ritardo", "Alta priorita"] },
  { id: "q027", category: "workflow", prompt: "Preferisci navigare da menu o da dashboard?", options: ["Menu", "Dashboard", "Ricerca", "Comando vocale"] },
  { id: "q028", category: "workflow", prompt: "Vuoi salvare viste personali?", options: ["Si", "No", "Solo preferite", "Solo per team"] },
  { id: "q029", category: "workflow", prompt: "Quale automazione sarebbe piu utile?", options: ["Reminder", "Report", "Priorita", "Preparazione riunione"] },
  { id: "q030", category: "workflow", prompt: "Quanto tempo vuoi spendere nella dashboard?", options: ["30 secondi", "2 minuti", "10 minuti", "Tutto il giorno"] },
  { id: "q031", category: "data", prompt: "Quale dato deve essere piu affidabile?", options: ["Importi", "Date", "Stati", "Quantita"] },
  { id: "q032", category: "data", prompt: "Vuoi vedere confronti con periodo precedente?", options: ["Si", "No", "Solo vendite", "Solo produzione"] },
  { id: "q033", category: "data", prompt: "Preferisci importi netti o lordi?", options: ["Netti", "Lordi", "Entrambi", "Non importa"] },
  { id: "q034", category: "data", prompt: "Quale dettaglio vuoi nel popover?", options: ["Documenti", "Storico", "Contatti", "Margini"] },
  { id: "q035", category: "data", prompt: "Vuoi dati geolocalizzati?", options: ["Si", "No", "Solo cantieri", "Solo clienti"] },
  { id: "q036", category: "data", prompt: "Vuoi vedere il valore economico per riga?", options: ["Si", "No", "Solo offerte", "Solo progetti"] },
  { id: "q037", category: "data", prompt: "Quale stato deve essere piu evidente?", options: ["Aperto", "Vinto", "Perso", "Concluso"] },
  { id: "q038", category: "data", prompt: "Quanto storico vuoi caricare?", options: ["30 giorni", "90 giorni", "12 mesi", "Tutto"] },
  { id: "q039", category: "data", prompt: "Vuoi distinguere dati reali e stimati?", options: ["Si", "No", "Solo forecast", "Solo margini"] },
  { id: "q040", category: "data", prompt: "Quale dashboard deve essere predefinita?", options: ["Overview", "Vendita", "Produzione", "My Dashboard"] },
  { id: "q041", category: "personal", prompt: "Che tono preferisci nei testi?", options: ["Diretto", "Calmo", "Tecnico", "Motivante"] },
  { id: "q042", category: "personal", prompt: "Preferisci lingua italiana o mista?", options: ["Italiano", "Inglese", "Mista", "Dipende dal reparto"] },
  { id: "q043", category: "personal", prompt: "Vuoi assistenza guidata durante l’uso?", options: ["Si", "No", "Solo primo accesso", "Solo errori"] },
  { id: "q044", category: "personal", prompt: "Vuoi una dashboard piu personale o aziendale?", options: ["Personale", "Aziendale", "Team", "Cliente"] },
  { id: "q045", category: "personal", prompt: "Quanto deve essere giocosa l’esperienza?", options: ["Zero", "Poco", "Molto", "Totale"] },
  { id: "q046", category: "personal", prompt: "Vuoi scegliere foto e sfondi?", options: ["Si", "No", "Solo preset", "Solo admin"] },
  { id: "q047", category: "personal", prompt: "Vuoi scegliere font e stile numeri?", options: ["Si", "No", "Solo font", "Solo numeri"] },
  { id: "q048", category: "personal", prompt: "Vuoi profili diversi per device?", options: ["Desktop", "Tablet", "Mobile", "Tutti"] },
  { id: "q049", category: "personal", prompt: "Vuoi una fine configurazione con anteprima?", options: ["Si", "No", "Solo salvataggio", "Solo confronto"] },
  { id: "q050", category: "personal", prompt: "Dopo le domande cosa vuoi ottenere?", options: ["Dashboard pronta", "3 varianti", "Report", "Bozza modificabile"] },
];

export const DEFAULT_DASHBOARD_EXPERIENCE_SETTINGS: DashboardExperienceSettings = {
  activeDashboardIds: ["overview", "forecast", "vendita", "my-dashboard"],
  userSequences: {},
};

export function normalizeDashboardExperienceSettings(
  value: unknown,
): DashboardExperienceSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_DASHBOARD_EXPERIENCE_SETTINGS;
  }

  const raw = value as Partial<DashboardExperienceSettings>;
  const validDashboardIds = new Set(
    DASHBOARD_EXPERIENCE_DASHBOARDS.map((dashboard) => dashboard.id),
  );
  const validQuestionIds = new Set(
    DASHBOARD_EXPERIENCE_QUESTIONS.map((question) => question.id),
  );

  const activeDashboardIds = Array.isArray(raw.activeDashboardIds)
    ? raw.activeDashboardIds.filter((id) => validDashboardIds.has(id))
    : DEFAULT_DASHBOARD_EXPERIENCE_SETTINGS.activeDashboardIds;

  const userSequences: Record<string, string[]> = {};
  if (raw.userSequences && typeof raw.userSequences === "object") {
    Object.entries(raw.userSequences).forEach(([userId, questionIds]) => {
      if (!Array.isArray(questionIds)) return;
      userSequences[userId] = questionIds.filter((id) => validQuestionIds.has(id));
    });
  }

  return {
    activeDashboardIds:
      activeDashboardIds.length > 0
        ? activeDashboardIds
        : DEFAULT_DASHBOARD_EXPERIENCE_SETTINGS.activeDashboardIds,
    userSequences,
  };
}

export function getDefaultQuestionSequence(limit = 50) {
  return DASHBOARD_EXPERIENCE_QUESTIONS.slice(0, limit).map(
    (question) => question.id,
  );
}
