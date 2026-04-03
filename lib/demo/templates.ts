import { AVAILABLE_MODULES } from "@/lib/module-config";

export const DEMO_TEMPLATE_KEYS = ["full_suite_arredo"] as const;
export const DEMO_SECTOR_KEYS = ["arredo", "falegnameria", "contract"] as const;
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
