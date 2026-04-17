export const SITE_SETTINGS_GUIDES = {
  modules: {
    summary: "Attiva solo i moduli utili per questo spazio.",
    details: [
      "Usa questa sezione per decidere quali aree del gestionale devono essere visibili agli utenti del sito.",
      "I moduli disattivati spariscono dalla navigazione e non vengono più proposti nelle operazioni quotidiane.",
    ],
  },
  codes: {
    summary: "Configura codici automatici e archiviazione offerte.",
    details: [
      "Qui definisci il formato dei codici che il sistema genera per offerte e attività.",
      "Puoi anche impostare le regole di chiusura o archiviazione per tenere pulito il flusso commerciale.",
    ],
  },
  products: {
    summary: "Gestisci categorie prodotto, icone e fornitori associati.",
    details: [
      "Organizza il catalogo in categorie chiare così offerte, prodotti e comandi vocali trovano subito il contesto giusto.",
      "Per ogni categoria puoi impostare un aspetto grafico coerente e salvare l'elenco dei fornitori più adatti.",
    ],
  },
  kanban: {
    summary: "Organizza le bacheche per aree operative.",
    details: [
      "Le categorie kanban servono per suddividere meglio i flussi in sidebar e nelle viste operative.",
      "Conviene mantenere poche categorie ben riconoscibili e con descrizioni chiare per evitare confusione.",
    ],
  },
  factory: {
    summary: "Configura reparti e macchinari della fabbrica.",
    details: [
      "Crea i reparti produttivi e inserisci i macchinari principali con immagine e costo orario.",
      "Questa impostazione prepara una base dati utile per produzione, analisi e preventivi.",
    ],
  },
  inventory: {
    summary: "Raggruppa articoli e materiale di magazzino.",
    details: [
      "Le categorie inventario aiutano a filtrare articoli, import CSV e report di magazzino.",
      "Mantieni codici e descrizioni coerenti per rendere la ricerca più veloce e affidabile.",
    ],
  },
  hr: {
    summary: "Controlla accessi dei collaboratori e costi orari.",
    details: [
      "Qui puoi verificare gli utenti attivi del sito, impostare il costo orario e aprire i permessi individuali.",
      "Usa questa sezione per allineare ruoli, accessi ai moduli e costi del personale.",
    ],
  },
  ai: {
    summary: "Configura provider AI, API key e istruzioni vocali.",
    details: [
      "Questa area raccoglie il provider AI, la trascrizione vocale e le note operative per ogni schermata con microfono.",
      "Aggiungi istruzioni semplici così il team sa quali dati pronunciare per ottenere un comando corretto.",
    ],
  },
  theme: {
    summary: "Gestisci colori card/sfondo e modalita tema del sito.",
    details: [
      "Usa questa sezione per impostare i 4 colori base di menu e schermate mantenendo un buon contrasto visivo.",
      "Puoi scegliere tra modalita light, dark e adaptive e applicare preset consigliati senza toccare altri moduli.",
    ],
  },
  support: {
    summary: "Controlla abbonamento e apri supporto immediato.",
    details: [
      "In questa sezione trovi lo stato del piano, il rinnovo e le postazioni incluse per il sito corrente.",
      "Puoi inviare una richiesta assistenza specifica con priorita direttamente dal pannello.",
    ],
  },
  commandDeck: {
    summary:
      "Abilita la navigazione immersiva Command Deck per questo spazio.",
    details: [
      "Quando la 3D Desk View e attiva, un bottone Orbit compare nella sidebar accanto al logo del sito e la rotta /command-deck diventa disponibile.",
      "I cerchi orbitanti attorno ai 7 nodi principali (Clienti, Fornitori, Prodotti, Progetti, Inventario, Fabbrica, Admin) sono popolati con i dati reali gia presenti nel sito.",
    ],
  },
} as const;

export type SiteSettingsGuideKey = keyof typeof SITE_SETTINGS_GUIDES;

export const VOICE_INTENT_REQUIREMENTS: Record<string, string[]> = {
  create_project: [
    "nome progetto o riferimento cliente",
    "categoria o contesto del lavoro",
  ],
  create_offer: [
    "cliente o prospect",
    "importo o descrizione economica",
  ],
  create_client: [
    "nome cliente",
    "almeno un dato di contatto o indirizzo",
  ],
  create_product: [
    "nome prodotto",
    "categoria prodotto",
  ],
  schedule_task: [
    "progetto o card di riferimento",
    "data e orario",
  ],
  log_time: [
    "progetto o attività interna",
    "durata da registrare",
  ],
  move_card: [
    "codice o nome della card",
    "colonna di destinazione",
  ],
};

export const ACTIVE_WORKSPACE_KEYS = ["matris-pro", "santini", "mb"] as const;
export const CUSTOM_DEMO_KEYS = [
  "dadesign",
  "car-detailing",
  "cardetailing",
  "workpassion",
] as const;
