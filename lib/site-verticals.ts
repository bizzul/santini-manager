export type SiteVerticalKey = "default" | "speedywood";

export interface SiteVerticalProfile {
    key: SiteVerticalKey;
    displayName: string;
    menuLabels: {
        kanban: string;
        projects: string;
        reports: string;
    };
    dashboardTabs: {
        overview: string;
        vendita: string;
        produzione: string;
        inventario: string;
        prodotti: string;
    };
    pageCopy: {
        dashboardOverviewTitle: string;
        dashboardOverviewSubtitle: string;
        salesTitle: string;
        salesSubtitle: string;
        inventoryTitle: string;
        inventorySubtitle: string;
        productsTitle: string;
        productsSubtitle: string;
        productionTitle: string;
        productionSubtitle: string;
        clientsTitle: string;
        clientsSubtitle: string;
        productsPageTitle: string;
        productsPageSubtitle: string;
        inventoryPageTitle: string;
        inventoryPageSubtitle: string;
        suppliersTitle: string;
        suppliersSubtitle: string;
        projectsTitle: string;
        projectsSubtitle: string;
        reportsTitle: string;
        reportsSubtitle: string;
        offerCreateTitle: string;
        offerCreateSubtitle: string;
    };
}

export const DEFAULT_SITE_VERTICAL_PROFILE: SiteVerticalProfile = {
    key: "default",
    displayName: "Manager",
    menuLabels: {
        kanban: "Kanban",
        projects: "Progetti",
        reports: "Reports",
    },
    dashboardTabs: {
        overview: "Overview",
        vendita: "Vendita",
        produzione: "Produzione",
        inventario: "Inventario",
        prodotti: "Prodotti",
    },
    pageCopy: {
        dashboardOverviewTitle: "Dashboard - Overview",
        dashboardOverviewSubtitle: "Panoramica generale dell'azienda e KPI principali",
        salesTitle: "Dashboard - Vendita",
        salesSubtitle: "Pipeline commerciale, gestione offerte e analisi conversioni",
        inventoryTitle: "Dashboard - Inventario",
        inventorySubtitle: "Valore stock, categorie e criticita",
        productsTitle: "Dashboard - Prodotti",
        productsSubtitle: "Catalogo rivendita e produzione in elementi",
        productionTitle: "Dashboard - Produzione",
        productionSubtitle: "Monitoraggio lavori in produzione e carico reparti",
        clientsTitle: "Clienti",
        clientsSubtitle: "Anagrafica clienti e contatti commerciali",
        productsPageTitle: "Prodotti in vendita",
        productsPageSubtitle: "Catalogo articoli e listini pronti per offerte e ordini",
        inventoryPageTitle: "Magazzino",
        inventoryPageSubtitle: "Giacenze, articoli e disponibilita per la gestione operativa",
        suppliersTitle: "Fornitori",
        suppliersSubtitle: "Anagrafica e gestione fornitori",
        projectsTitle: "Gestione Progetti",
        projectsSubtitle: "Gestione operativa progetti, stato avanzamento e documentazione",
        reportsTitle: "Crea i documenti di reportistica",
        reportsSubtitle: "Report operativi e documenti PDF disponibili per il sito",
        offerCreateTitle: "Crea Nuova Offerta",
        offerCreateSubtitle: "Configura cliente, prodotti e condizioni della nuova offerta",
    },
};

export const SPEEDYWOOD_SITE_VERTICAL_PROFILE: SiteVerticalProfile = {
    key: "speedywood",
    displayName: "Speedywood",
    menuLabels: {
        kanban: "Richieste Offerta",
        projects: "Ordini",
        reports: "Analisi",
    },
    dashboardTabs: {
        overview: "Generale",
        vendita: "Commerciale",
        produzione: "Ordini",
        inventario: "Operativa",
        prodotti: "Catalogo",
    },
    pageCopy: {
        dashboardOverviewTitle: "Dashboard - Speedywood",
        dashboardOverviewSubtitle:
            "Panoramica commerciale e operativa della rivendita di prodotti in legno.",
        salesTitle: "Dashboard - Analisi Commerciale",
        salesSubtitle:
            "Richieste offerta, conversioni, mix clienti e tempi di consegna promessi.",
        inventoryTitle: "Dashboard - Analisi Operativa",
        inventorySubtitle:
            "Stock, materiali critici, copertura magazzino e rotazione referenze.",
        productsTitle: "Dashboard - Catalogo",
        productsSubtitle:
            "Assortimento legno, semilavorati e categorie ad alta richiesta.",
        productionTitle: "Dashboard - Ordini",
        productionSubtitle:
            "Preparazione ordini, avanzamento evasione e carico operativo del team.",
        clientsTitle: "Clienti",
        clientsSubtitle: "Privati, artigiani, PMI e aziende seguiti da Speedywood.",
        productsPageTitle: "Prodotti in legno e semilavorati",
        productsPageSubtitle:
            "Catalogo Speedywood con essenze, pannelli, profili e articoli per preventivi.",
        inventoryPageTitle: "Magazzino materiali",
        inventoryPageSubtitle:
            "Disponibilita, varianti, essenze e movimenti per la gestione ordini.",
        suppliersTitle: "Fornitori",
        suppliersSubtitle:
            "Segherie, importatori e partner per materiali, pannelli e semilavorati.",
        projectsTitle: "Ordini",
        projectsSubtitle:
            "Monitoraggio ordini confermati, evasione, consegna e documentazione.",
        reportsTitle: "Analisi e report",
        reportsSubtitle:
            "Documenti operativi e viste di analisi su offerte, magazzino e ordini.",
        offerCreateTitle: "Crea Nuova Richiesta Offerta",
        offerCreateSubtitle:
            "Imposta cliente, prodotti richiesti e tempi di fornitura per il preventivo.",
    },
};

const SITE_VERTICALS: Record<SiteVerticalKey, SiteVerticalProfile> = {
    default: DEFAULT_SITE_VERTICAL_PROFILE,
    speedywood: SPEEDYWOOD_SITE_VERTICAL_PROFILE,
};

export function resolveSiteVerticalProfile(value?: unknown): SiteVerticalProfile {
    if (!value) {
        return DEFAULT_SITE_VERTICAL_PROFILE;
    }

    if (typeof value === "string" && value in SITE_VERTICALS) {
        return SITE_VERTICALS[value as SiteVerticalKey];
    }

    if (typeof value === "object" && value !== null) {
        const key = (value as { key?: string }).key;
        if (key && key in SITE_VERTICALS) {
            return SITE_VERTICALS[key as SiteVerticalKey];
        }
    }

    return DEFAULT_SITE_VERTICAL_PROFILE;
}
