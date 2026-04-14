export interface ModuleConfig {
    name: string;
    label: string;
    description: string;
    icon: string;
    href: string;
    enabledByDefault: boolean;
    category?: "core" | "management" | "reports" | "tools";
    requiresPermission?: string;
}

export const AVAILABLE_MODULES: ModuleConfig[] = [
    {
        name: "dashboard",
        label: "Dashboard",
        description: "Panoramica iniziale con riepilogo e azioni rapide",
        icon: "faWaveSquare",
        href: "/dashboard",
        enabledByDefault: true,
        category: "core",
    },
    {
        name: "dashboard-forecast",
        label: "Dashboard Forecast",
        description: "Vista forecast della dashboard con analisi previsionale",
        icon: "faSquarePollVertical",
        href: "/dashboard/forecast",
        enabledByDefault: true,
        category: "core",
    },
    {
        name: "kanban",
        label: "Kanban",
        description: "Gestione attività e progetti con bacheche kanban",
        icon: "faTable",
        href: "/kanban",
        enabledByDefault: true,
        category: "management",
    },
    {
        name: "projects",
        label: "Progetti",
        description: "Gestione progetti, avanzamento e monitoraggio",
        icon: "faTable",
        href: "/projects",
        enabledByDefault: false,
        category: "management",
    },
    {
        name: "calendar",
        label: "Calendario",
        description: "Calendario operativo e pianificazione attività",
        icon: "faClock",
        href: "/calendar",
        enabledByDefault: false,
        category: "management",
    },
    {
        name: "clients",
        label: "Clienti",
        description: "Anagrafica clienti e contatti commerciali",
        icon: "faUser",
        href: "/clients",
        enabledByDefault: true,
        category: "management",
    },
    {
        name: "errortracking",
        label: "Errori",
        description: "Registro errori e gestione delle anomalie",
        icon: "faExclamation",
        href: "/errortracking",
        enabledByDefault: false,
        category: "tools",
    },
    {
        name: "timetracking",
        label: "Ore",
        description: "Rilevazione ore e controllo delle attività",
        icon: "faClock",
        href: "/timetracking",
        enabledByDefault: false,
        category: "tools",
    },
    {
        name: "report-time",
        label: "Report Ore",
        description: "Report delle ore lavorate dai collaboratori",
        icon: "faClock",
        href: "/reports",
        enabledByDefault: false,
        category: "reports",
    },
    {
        name: "report-inventory",
        label: "Report Inventario",
        description: "Report situazione inventario attuale",
        icon: "faWarehouse",
        href: "/reports",
        enabledByDefault: false,
        category: "reports",
    },
    {
        name: "report-projects",
        label: "Report Progetti",
        description: "Report situazione progetti attuali",
        icon: "faTable",
        href: "/reports",
        enabledByDefault: false,
        category: "reports",
    },
    {
        name: "report-errors",
        label: "Report Errori",
        description: "Report errori per fornitore e data",
        icon: "faExclamation",
        href: "/reports",
        enabledByDefault: false,
        category: "reports",
    },
    {
        name: "report-imb",
        label: "Report Imballaggio",
        description: "Report PDF imballaggio per progetto",
        icon: "faBox",
        href: "/reports",
        enabledByDefault: false,
        category: "reports",
    },
    {
        name: "qualitycontrol",
        label: "Quality Control",
        description: "Controllo qualità e verifiche operative",
        icon: "faCheckSquare",
        href: "/qualityControl",
        enabledByDefault: false,
        category: "tools",
    },
    {
        name: "boxing",
        label: "Imballaggio",
        description: "Gestione imballaggio e spedizione",
        icon: "faBox",
        href: "/boxing",
        enabledByDefault: false,
        category: "tools",
    },
    {
        name: "inventory",
        label: "Magazzino",
        description: "Magazzino, articoli e giacenze",
        icon: "faWarehouse",
        href: "/inventory",
        enabledByDefault: true,
        category: "management",
    },
    {
        name: "factory",
        label: "Fabbrica",
        description: "Panoramica reparti, macchinari e flussi produzione",
        icon: "faIndustry",
        href: "/factory",
        enabledByDefault: false,
        category: "management",
    },
    {
        name: "products",
        label: "Prodotti",
        description: "Catalogo prodotti e relative configurazioni",
        icon: "faBox",
        href: "/products",
        enabledByDefault: true,
        category: "management",
    },
    {
        name: "suppliers",
        label: "Fornitori",
        description: "Anagrafica e gestione fornitori",
        icon: "faHelmetSafety",
        href: "/suppliers",
        enabledByDefault: true,
        category: "management",
    },
    {
        name: "manufacturers",
        label: "Produttori",
        description: "Anagrafica produttori e lavorazioni",
        icon: "faIndustry",
        href: "/manufacturers",
        enabledByDefault: true,
        category: "management",
    },
    {
        name: "collaborators",
        label: "Collaboratori",
        description: "Gestione collaboratori e accessi",
        icon: "faUserTie",
        href: "/collaborators",
        enabledByDefault: true,
        category: "management",
    },
    {
        name: "categories",
        label: "Categorie",
        description: "Gestione categorie operative",
        icon: "faListUl",
        href: "/categories",
        enabledByDefault: true,
        category: "management",
    },
    {
        name: "voice-input",
        label: "Input Vocale",
        description: "Crea progetti tramite dettatura vocale con AI",
        icon: "faMicrophone",
        href: "",
        enabledByDefault: false,
        category: "tools",
    },
    {
        name: "attendance",
        label: "Presenze",
        description: "Registro presenze con vista calendario e gestione ferie",
        icon: "faCalendarCheck",
        href: "/attendance",
        enabledByDefault: false,
        category: "management",
    },
];

export const getModuleByName = (name: string): ModuleConfig | undefined => {
    return AVAILABLE_MODULES.find((module) => module.name === name);
};

export const getModulesByCategory = (category: string): ModuleConfig[] => {
    return AVAILABLE_MODULES.filter((module) => module.category === category);
};

export const getDefaultEnabledModules = (): string[] => {
    return AVAILABLE_MODULES
        .filter((module) => module.enabledByDefault)
        .map((module) => module.name);
};
