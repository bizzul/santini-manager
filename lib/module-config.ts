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
        description: "Main dashboard with overview and quick actions",
        icon: "faWaveSquare",
        href: "/dashboard",
        enabledByDefault: true,
        category: "core",
    },
    {
        name: "kanban",
        label: "Kanban",
        description: "Project management with kanban boards",
        icon: "faTable",
        href: "/kanban",
        enabledByDefault: true,
        category: "management",
    },
    {
        name: "projects",
        label: "Progetti",
        description: "Project management and tracking",
        icon: "faTable",
        href: "/projects",
        enabledByDefault: false,
        category: "management",
    },
    {
        name: "calendar",
        label: "Calendario",
        description: "Calendar and scheduling",
        icon: "faClock",
        href: "/calendar",
        enabledByDefault: false,
        category: "management",
    },
    {
        name: "clients",
        label: "Clienti",
        description: "Client management and contacts",
        icon: "faUser",
        href: "/clients",
        enabledByDefault: true,
        category: "management",
    },
    {
        name: "errortracking",
        label: "Errori",
        description: "Error tracking and management",
        icon: "faExclamation",
        href: "/errortracking",
        enabledByDefault: false,
        category: "tools",
    },
    {
        name: "timetracking",
        label: "Ore",
        description: "Time tracking and management",
        icon: "faClock",
        href: "/timetracking",
        enabledByDefault: false,
        category: "tools",
    },
    {
        name: "reports",
        label: "Reports",
        description: "Reports and analytics",
        icon: "faSquarePollVertical",
        href: "/reports",
        enabledByDefault: false,
        category: "reports",
    },
    {
        name: "qualitycontrol",
        label: "Quality Control",
        description: "Quality control management",
        icon: "faCheckSquare",
        href: "/qualityControl",
        enabledByDefault: false,
        category: "tools",
    },
    {
        name: "boxing",
        label: "Imballaggio",
        description: "Packing and shipping management",
        icon: "faBox",
        href: "/boxing",
        enabledByDefault: false,
        category: "tools",
    },
    {
        name: "inventory",
        label: "Inventario",
        description: "Inventory management",
        icon: "faBox",
        href: "/inventory",
        enabledByDefault: true,
        category: "management",
    },
    {
        name: "products",
        label: "Prodotti",
        description: "Product catalog and management",
        icon: "faBox",
        href: "/products",
        enabledByDefault: true,
        category: "management",
    },
    {
        name: "suppliers",
        label: "Fornitori",
        description: "Supplier management",
        icon: "faHelmetSafety",
        href: "/suppliers",
        enabledByDefault: true,
        category: "management",
    },
    {
        name: "categories",
        label: "Categorie",
        description: "Category management",
        icon: "faTable",
        href: "/categories",
        enabledByDefault: true,
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
