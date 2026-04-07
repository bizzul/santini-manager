import { AVAILABLE_MODULES } from "@/lib/module-config";

export const DEMO_TEMPLATE_KEYS = [
    "full_suite_arredo",
    "full_suite_speedywood",
] as const;
export const DEMO_SECTOR_KEYS = [
    "arredo",
    "falegnameria",
    "contract",
    "rivendita_legno",
] as const;
export const DEMO_SCENARIO_KEYS = ["full_suite", "commerciale", "operations"] as const;
export const DEMO_DATA_INTENSITIES = ["low", "medium", "high"] as const;

export type DemoTemplateKey = (typeof DEMO_TEMPLATE_KEYS)[number];
export type DemoSectorKey = (typeof DEMO_SECTOR_KEYS)[number];
export type DemoScenarioKey = (typeof DEMO_SCENARIO_KEYS)[number];
export type DemoDataIntensity = (typeof DEMO_DATA_INTENSITIES)[number];

export interface DemoTemplateDefinition {
    key: DemoTemplateKey;
    label: string;
    sector: DemoSectorKey;
    scenario: DemoScenarioKey;
    description: string;
    defaultEnabledModules: string[];
    defaultPainPoints: string[];
    defaultDesiredOutcomes: string[];
    defaultLandingTitle: string;
    defaultLandingSubtitle: string;
    defaultIntroNarrative: string;
    defaultRecommendedModules: string[];
    defaultCtaLabel: string;
}

const FULL_SUITE_ARREDO_MODULES = [
    "dashboard",
    "kanban",
    "clients",
    "inventory",
    "products",
    "suppliers",
    "manufacturers",
    "timetracking",
    "attendance",
    "reports",
    "voice-input",
];

const FULL_SUITE_SPEEDYWOOD_MODULES = [
    "dashboard",
    "kanban",
    "clients",
    "products",
    "inventory",
    "suppliers",
    "projects",
    "report-inventory",
    "report-projects",
];

export const DEMO_TEMPLATES: DemoTemplateDefinition[] = [
    {
        key: "full_suite_arredo",
        label: "Full Suite Arredo",
        sector: "arredo",
        scenario: "full_suite",
        description:
            "Demo completa per aziende arredo/contract con pipeline commerciale, produzione, magazzino e presenze.",
        defaultEnabledModules: FULL_SUITE_ARREDO_MODULES,
        defaultPainPoints: [
            "Offerte e commesse gestite su strumenti separati",
            "Pochissima visibilità su avanzamento e colli di bottiglia",
            "Magazzino e fabbisogni materiali non allineati ai lavori",
            "Ore e presenze raccolte in modo manuale e poco affidabile",
        ],
        defaultDesiredOutcomes: [
            "Ridurre i tempi di passaggio da offerta a produzione",
            "Avere KPI chiari su lavori, tempi e materiali",
            "Centralizzare operatività, documenti e follow-up commerciali",
        ],
        defaultLandingTitle:
            "Una demo costruita sui flussi reali della tua azienda arredo",
        defaultLandingSubtitle:
            "Vedrai offerte, produzione, magazzino e presenze con dati coerenti e una narrativa pensata per il prospect.",
        defaultIntroNarrative:
            "Abbiamo preparato un ambiente demo dedicato che simula una settimana reale di lavoro, con clienti, offerte, ordini, attività operative e personale già popolati.",
        defaultRecommendedModules: [
            "Dashboard",
            "Kanban offerte e commesse",
            "Magazzino",
            "Timetracking",
            "Presenze",
        ],
        defaultCtaLabel: "Entra nella demo",
    },
    {
        key: "full_suite_speedywood",
        label: "Full Data Manager - Speedywood",
        sector: "rivendita_legno",
        scenario: "full_suite",
        description:
            "Demo verticale per Speedywood con richieste offerta, catalogo legno, magazzino e ordini riutilizzando il backend esistente.",
        defaultEnabledModules: FULL_SUITE_SPEEDYWOOD_MODULES,
        defaultPainPoints: [
            "Richieste offerta, listini e disponibilita sono distribuiti tra email, fogli e telefonate",
            "Lead time e disponibilita fornitori non sono visibili fin dal primo contatto commerciale",
            "Magazzino e ordini non hanno una vista unica su essenze, pannelli e semilavorati",
            "Privati e aziende seguono flussi diversi ma senza un controllo centralizzato",
        ],
        defaultDesiredOutcomes: [
            "Ridurre il tempo medio di preparazione offerte e conferma ordine",
            "Centralizzare catalogo, disponibilita, lead time e storico clienti",
            "Avere KPI chiari su offerte, stock critico e ordini in evasione",
        ],
        defaultLandingTitle:
            "Una demo costruita sui flussi commerciali e operativi di Speedywood",
        defaultLandingSubtitle:
            "Troverai richieste offerta, prodotti in legno, magazzino e ordini con dati gia' coerenti per il mercato privati e B2B.",
        defaultIntroNarrative:
            "Abbiamo preparato un ambiente demo dedicato a speedywood.ch con clienti privati e aziende, prodotti in legno e semilavorati, fornitori, richieste offerta e ordini gia' pronti da esplorare.",
        defaultRecommendedModules: [
            "Dashboard",
            "Richieste Offerta",
            "Prodotti",
            "Magazzino",
            "Ordini",
            "Analisi",
        ],
        defaultCtaLabel: "Entra nella demo Speedywood",
    },
];

export const DEFAULT_DEMO_TEMPLATE = DEMO_TEMPLATES[0];

export function getDemoTemplateByKey(key?: string) {
    return DEMO_TEMPLATES.find((template) => template.key === key) ??
        DEFAULT_DEMO_TEMPLATE;
}

export function getDemoModuleOptions() {
    return AVAILABLE_MODULES.map((module) => ({
        name: module.name,
        label: module.label,
        enabledByDefault: module.enabledByDefault,
    }));
}
