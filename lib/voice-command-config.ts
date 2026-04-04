export const VOICE_COMMAND_INTENTS = [
    "create_project",
    "create_offer",
    "create_client",
    "create_product",
    "schedule_task",
    "log_time",
    "move_card",
    "unknown",
] as const;

export type VoiceCommandIntent = (typeof VOICE_COMMAND_INTENTS)[number];

export const SUPPORTED_VOICE_COMMAND_INTENTS = [
    "create_project",
    "create_offer",
    "create_client",
    "create_product",
    "schedule_task",
    "log_time",
    "move_card",
] as const;

export type SupportedVoiceCommandIntent = Exclude<VoiceCommandIntent, "unknown">;

export type VoiceCommandScreenKey =
    | "general"
    | "projects"
    | "kanban"
    | "offerte"
    | "offer-create"
    | "clients"
    | "products"
    | "calendar"
    | "calendar-installation"
    | "calendar-service"
    | "timetracking";

export type VoiceKeywordGroupId =
    | "action"
    | "entity"
    | "destination"
    | "date"
    | "duration";

type VoiceKeywordGroupRule = {
    id: VoiceKeywordGroupId;
    label: string;
    keywords?: string[];
    patterns?: RegExp[];
};

type VoiceKeywordIntentRule = {
    intent: SupportedVoiceCommandIntent;
    requiredGroups: VoiceKeywordGroupRule[];
};

export type VoiceCommandKeywordCoverage = {
    intent: SupportedVoiceCommandIntent;
    matched: boolean;
    matchedGroups: VoiceKeywordGroupId[];
    missingGroups: VoiceKeywordGroupId[];
    missingLabels: string[];
};

export type VoiceCommandKeywordAnalysis = {
    normalizedTranscript: string;
    recognizedIntents: SupportedVoiceCommandIntent[];
    coverage: VoiceCommandKeywordCoverage[];
};

export type VoiceCommandScreenContext = {
    key: VoiceCommandScreenKey;
    label: string;
    module: string;
    description: string;
    allowedIntents: SupportedVoiceCommandIntent[];
    examples: string[];
};

export const VOICE_COMMAND_INTENT_LABELS: Record<
    SupportedVoiceCommandIntent,
    string
> = {
    create_project: "creare progetto",
    create_offer: "creare offerta",
    create_client: "aggiungere cliente",
    create_product: "aggiungere prodotto",
    schedule_task: "pianificare task",
    log_time: "registrare ore",
    move_card: "spostare progetto",
};

export const VOICE_COMMAND_SCREEN_CONTEXTS: Record<
    VoiceCommandScreenKey,
    VoiceCommandScreenContext
> = {
    general: {
        key: "general",
        label: "Generale",
        module: "general",
        description:
            "Contesto generico: l'assistente puo' provare a riconoscere i comandi principali.",
        allowedIntents: [
            "create_project",
            "create_offer",
            "create_client",
            "create_product",
            "schedule_task",
            "log_time",
            "move_card",
        ],
        examples: [
            "Sposta il progetto 26-632 in inviata",
            "Crea offerta per Rossi serramenti da 4500 franchi",
        ],
    },
    projects: {
        key: "projects",
        label: "Gestione Progetti",
        module: "projects",
        description:
            "Qui l'assistente si concentra su creazione e spostamento dei progetti.",
        allowedIntents: ["create_project", "move_card"],
        examples: [
            "Sposta il progetto 26-632 in produzione",
            "Crea progetto cucina villa Bianchi a Lugano",
        ],
    },
    kanban: {
        key: "kanban",
        label: "Kanban",
        module: "kanban",
        description:
            "Nel kanban puoi creare elementi e spostarli tra le colonne.",
        allowedIntents: ["create_project", "create_offer", "move_card"],
        examples: [
            "Sposta il progetto 26-632 in inviata",
            "Crea offerta per cliente Rossi da 4500 franchi",
        ],
    },
    offerte: {
        key: "offerte",
        label: "Offerte",
        module: "offerte",
        description:
            "In questa schermata puoi creare offerte e muovere le card delle offerte.",
        allowedIntents: ["create_offer", "move_card", "create_client"],
        examples: [
            "Crea offerta per Rossi serramenti a Lugano da 4500 franchi",
            "Sposta l'offerta 26-044-OFF in trattativa",
        ],
    },
    "offer-create": {
        key: "offer-create",
        label: "Creazione Offerta",
        module: "offerte",
        description:
            "Durante la creazione di un'offerta puoi aggiungere clienti o prodotti mancanti.",
        allowedIntents: ["create_offer", "create_client", "create_product"],
        examples: [
            "Aggiungi cliente Bianchi SA in via Roma 1 Lugano 6900 Svizzera",
            "Aggiungi prodotto armadio categoria cucine",
        ],
    },
    clients: {
        key: "clients",
        label: "Clienti",
        module: "clients",
        description:
            "In questa schermata l'assistente crea nuovi clienti con i dati anagrafici.",
        allowedIntents: ["create_client"],
        examples: [
            "Aggiungi cliente Bianchi SA in via Roma 1 Lugano 6900 Svizzera",
            "Crea cliente Mario Rossi in via Cantonale 12 Bellinzona 6500 Svizzera",
        ],
    },
    products: {
        key: "products",
        label: "Prodotti",
        module: "products",
        description:
            "Qui l'assistente aggiunge prodotti in vendita con nome e categoria.",
        allowedIntents: ["create_product"],
        examples: [
            "Aggiungi prodotto armadio categoria cucine",
            "Crea articolo tavolo rovere categoria soggiorno",
        ],
    },
    calendar: {
        key: "calendar",
        label: "Calendario",
        module: "calendar",
        description:
            "Nel calendario l'assistente privilegia la pianificazione delle card.",
        allowedIntents: ["schedule_task"],
        examples: [
            "Pianifica il progetto 26-044 il 15 aprile alle 08:00",
            "Programma la card Rossi domani squadra 2",
        ],
    },
    "calendar-installation": {
        key: "calendar-installation",
        label: "Calendario Installazione",
        module: "calendar-installation",
        description:
            "Nel calendario installazione puoi pianificare progetti e interventi.",
        allowedIntents: ["schedule_task"],
        examples: [
            "Pianifica il progetto 26-044 il 15 aprile alle 08:00",
            "Programma la card Rossi domani squadra 2",
        ],
    },
    "calendar-service": {
        key: "calendar-service",
        label: "Calendario Service",
        module: "calendar-service",
        description:
            "Nel calendario service puoi pianificare task e appuntamenti.",
        allowedIntents: ["schedule_task"],
        examples: [
            "Pianifica il progetto 26-044 il 15 aprile alle 08:00",
            "Programma la card Rossi domani squadra 2",
        ],
    },
    timetracking: {
        key: "timetracking",
        label: "Time Tracking",
        module: "timetracking",
        description:
            "Qui l'assistente registra ore su progetto o attivita' interne.",
        allowedIntents: ["log_time"],
        examples: [
            "Registra 2 ore sul progetto 26-011 reparto montaggio",
            "Registra 1 ora e 30 minuti attivita' interna ufficio",
        ],
    },
};

export function getVoiceCommandScreenContexts() {
  return Object.values(VOICE_COMMAND_SCREEN_CONTEXTS);
}

const CREATE_ACTION_GROUP: VoiceKeywordGroupRule = {
    id: "action",
    label: "verbo di creazione",
    keywords: [
        "crea",
        "creare",
        "aggiungi",
        "aggiungere",
        "nuovo",
        "nuova",
        "inserisci",
        "inserire",
    ],
};

const MOVE_ACTION_GROUP: VoiceKeywordGroupRule = {
    id: "action",
    label: "verbo di spostamento",
    keywords: [
        "sposta",
        "spostare",
        "muovi",
        "muovere",
        "porta",
        "porta in",
        "manda",
        "metti",
    ],
};

const SCHEDULE_ACTION_GROUP: VoiceKeywordGroupRule = {
    id: "action",
    label: "verbo di pianificazione",
    keywords: ["pianifica", "pianificare", "programma", "programmare", "schedula"],
};

const LOG_ACTION_GROUP: VoiceKeywordGroupRule = {
    id: "action",
    label: "verbo di registrazione",
    keywords: ["registra", "registrare", "segna", "segnare", "inserisci", "inserire"],
};

const VOICE_COMMAND_KEYWORD_RULES: Record<
    SupportedVoiceCommandIntent,
    VoiceKeywordIntentRule
> = {
    create_project: {
        intent: "create_project",
        requiredGroups: [
            CREATE_ACTION_GROUP,
            {
                id: "entity",
                label: "parola progetto",
                keywords: ["progetto", "commessa", "lavoro"],
            },
        ],
    },
    create_offer: {
        intent: "create_offer",
        requiredGroups: [
            CREATE_ACTION_GROUP,
            {
                id: "entity",
                label: "parola offerta",
                keywords: ["offerta", "preventivo"],
            },
        ],
    },
    create_client: {
        intent: "create_client",
        requiredGroups: [
            CREATE_ACTION_GROUP,
            {
                id: "entity",
                label: "parola cliente",
                keywords: ["cliente", "azienda", "contatto"],
            },
        ],
    },
    create_product: {
        intent: "create_product",
        requiredGroups: [
            CREATE_ACTION_GROUP,
            {
                id: "entity",
                label: "parola prodotto",
                keywords: ["prodotto", "articolo", "listino", "voce di listino"],
            },
        ],
    },
    schedule_task: {
        intent: "schedule_task",
        requiredGroups: [
            SCHEDULE_ACTION_GROUP,
            {
                id: "entity",
                label: "parola task o progetto",
                keywords: ["task", "card", "progetto", "intervento"],
            },
            {
                id: "date",
                label: "indicazione temporale",
                keywords: [
                    "oggi",
                    "domani",
                    "dopodomani",
                    "lunedi",
                    "martedi",
                    "mercoledi",
                    "giovedi",
                    "venerdi",
                    "sabato",
                    "domenica",
                ],
                patterns: [
                    /\b\d{1,2}\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b/i,
                    /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/,
                ],
            },
        ],
    },
    log_time: {
        intent: "log_time",
        requiredGroups: [
            LOG_ACTION_GROUP,
            {
                id: "duration",
                label: "durata",
                keywords: ["ora", "ore", "minuto", "minuti"],
                patterns: [/\b\d+\s*(ora|ore|minuto|minuti)\b/i],
            },
        ],
    },
    move_card: {
        intent: "move_card",
        requiredGroups: [
            MOVE_ACTION_GROUP,
            {
                id: "entity",
                label: "parola progetto o card",
                keywords: ["progetto", "card", "commessa", "lavoro", "offerta"],
            },
            {
                id: "destination",
                label: "destinazione",
                patterns: [/\b(?:in|nel|nella|nello|su|sul|sulla|verso)\s+[a-z0-9-]+/i],
            },
        ],
    },
};

export function normalizeVoiceCommandText(value?: string | null) {
    return (value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function textMatchesKeywordGroup(
    transcript: string,
    normalizedTranscript: string,
    group: VoiceKeywordGroupRule
) {
    const keywordMatch =
        group.keywords?.some((keyword) =>
            normalizedTranscript.includes(normalizeVoiceCommandText(keyword))
        ) || false;

    const patternMatch =
        group.patterns?.some((pattern) => pattern.test(transcript)) || false;

    return keywordMatch || patternMatch;
}

export function getVoiceCommandScreenContext(pathname?: string | null) {
    if (!pathname) {
        return VOICE_COMMAND_SCREEN_CONTEXTS.general;
    }

    if (pathname.includes("/offerte/create")) {
        return VOICE_COMMAND_SCREEN_CONTEXTS["offer-create"];
    }

    if (pathname.includes("/clients")) {
        return VOICE_COMMAND_SCREEN_CONTEXTS.clients;
    }

    if (pathname.includes("/products")) {
        return VOICE_COMMAND_SCREEN_CONTEXTS.products;
    }

    if (pathname.includes("/calendar-service")) {
        return VOICE_COMMAND_SCREEN_CONTEXTS["calendar-service"];
    }

    if (pathname.includes("/calendar-installation")) {
        return VOICE_COMMAND_SCREEN_CONTEXTS["calendar-installation"];
    }

    if (pathname.includes("/calendar")) {
        return VOICE_COMMAND_SCREEN_CONTEXTS.calendar;
    }

    if (pathname.includes("/timetracking")) {
        return VOICE_COMMAND_SCREEN_CONTEXTS.timetracking;
    }

    if (pathname.includes("/offerte")) {
        return VOICE_COMMAND_SCREEN_CONTEXTS.offerte;
    }

    if (pathname.includes("/projects")) {
        return VOICE_COMMAND_SCREEN_CONTEXTS.projects;
    }

    if (pathname.includes("/kanban")) {
        return VOICE_COMMAND_SCREEN_CONTEXTS.kanban;
    }

    return VOICE_COMMAND_SCREEN_CONTEXTS.general;
}

export function getVoiceCommandIntentLabel(intent: SupportedVoiceCommandIntent) {
    return VOICE_COMMAND_INTENT_LABELS[intent];
}

export function getVoiceCommandIntentLabels(
    intents: readonly SupportedVoiceCommandIntent[]
) {
    return intents.map((intent) => getVoiceCommandIntentLabel(intent));
}

export function analyzeVoiceCommandKeywords(
    transcript: string,
    allowedIntents: readonly SupportedVoiceCommandIntent[] = SUPPORTED_VOICE_COMMAND_INTENTS
): VoiceCommandKeywordAnalysis {
    const normalizedTranscript = normalizeVoiceCommandText(transcript);
    const uniqueAllowedIntents = Array.from(new Set(allowedIntents));

    const coverage = uniqueAllowedIntents
        .map((intent) => {
            const rule = VOICE_COMMAND_KEYWORD_RULES[intent];
            if (!rule) {
                return null;
            }

            const matchedGroups = rule.requiredGroups
                .filter((group) =>
                    textMatchesKeywordGroup(transcript, normalizedTranscript, group)
                )
                .map((group) => group.id);

            const missingGroups = rule.requiredGroups
                .filter((group) => !matchedGroups.includes(group.id))
                .map((group) => group.id);

            const missingLabels = rule.requiredGroups
                .filter((group) => !matchedGroups.includes(group.id))
                .map((group) => group.label);

            return {
                intent,
                matched: missingGroups.length === 0,
                matchedGroups,
                missingGroups,
                missingLabels,
            } satisfies VoiceCommandKeywordCoverage;
        })
        .filter((entry): entry is VoiceCommandKeywordCoverage => entry !== null);

    return {
        normalizedTranscript,
        recognizedIntents: coverage
            .filter((entry) => entry.matched)
            .map((entry) => entry.intent),
        coverage,
    };
}

export function describeKeywordCoverage(
    transcript: string,
    allowedIntents: readonly SupportedVoiceCommandIntent[]
) {
    return analyzeVoiceCommandKeywords(transcript, allowedIntents).coverage.map(
        (entry) =>
            `${getVoiceCommandIntentLabel(entry.intent)}: ${
                entry.matched
                    ? "keyword minime presenti"
                    : `mancano ${entry.missingLabels.join(", ")}`
            }`
    );
}
