import type {
    FactoryDepartmentMeta,
    FactoryDepartmentSeed,
    FactoryMachineIcon,
    FactoryMachineMeta,
    FactoryMockSource,
    FactoryMachineStatus,
} from "@/lib/factory/types";

type FactoryMachineTemplate = {
    name: string;
    code: string;
    icon: FactoryMachineIcon;
    description: string;
    powerKw: number;
    throughputPerHour: number;
    footprint: string;
    precision: string;
    acquisitionDate: string;
    bookValueEur: number;
    depreciationProgress: number;
    baseWorkedHours: number;
    baseUtilization: number;
    baseEfficiency: number;
    operatorSlots: number;
    lastServiceDate: string;
    nextServiceDate: string;
    hoursUntilService: number;
    tags: string[];
};

type FactoryDepartmentTemplate = {
    id: string;
    name: string;
    shortLabel: string;
    description: string;
    accentColor: string;
    icon: FactoryMachineIcon;
    matchers: string[];
    focusAreas: string[];
    machines: FactoryMachineTemplate[];
};

const FACTORY_DEPARTMENT_TEMPLATES: FactoryDepartmentTemplate[] = [
    {
        id: "taglio",
        name: "Taglio e Preparazione",
        shortLabel: "Taglio",
        description:
            "Centro di preparazione materiali con focus su precisione, nesting e riduzione degli scarti.",
        accentColor: "#f97316",
        icon: "laser",
        matchers: ["taglio", "laser", "sezion", "cut", "panel", "prepar"],
        focusAreas: ["Ottimizzazione pannelli", "Riduzione scarti", "Setup rapido"],
        machines: [
            {
                name: "Sezionatrice intelligente",
                code: "TG-240",
                icon: "laser",
                description:
                    "Linea di taglio per pannelli e componenti su misura con nesting assistito.",
                powerKw: 24,
                throughputPerHour: 38,
                footprint: "8.2 x 4.6 m",
                precision: "0.2 mm",
                acquisitionDate: "2021-05-12",
                bookValueEur: 148000,
                depreciationProgress: 52,
                baseWorkedHours: 11840,
                baseUtilization: 66,
                baseEfficiency: 88,
                operatorSlots: 2,
                lastServiceDate: "2026-02-18",
                nextServiceDate: "2026-05-20",
                hoursUntilService: 92,
                tags: ["Nesting", "Pannelli", "Barcode"],
            },
            {
                name: "Laser compositi",
                code: "LS-88",
                icon: "cnc",
                description:
                    "Taglio fine per profili e componenti speciali con qualità bordo controllata.",
                powerKw: 18,
                throughputPerHour: 26,
                footprint: "6.4 x 3.8 m",
                precision: "0.1 mm",
                acquisitionDate: "2022-11-03",
                bookValueEur: 96000,
                depreciationProgress: 41,
                baseWorkedHours: 8240,
                baseUtilization: 58,
                baseEfficiency: 84,
                operatorSlots: 1,
                lastServiceDate: "2026-03-01",
                nextServiceDate: "2026-06-10",
                hoursUntilService: 126,
                tags: ["Compositi", "Sagome", "Taglio fine"],
            },
        ],
    },
    {
        id: "assemblaggio",
        name: "Assemblaggio",
        shortLabel: "Assembly",
        description:
            "Reparto dedicato a montaggio, premontaggio kit e sincronizzazione dei componenti.",
        accentColor: "#3b82f6",
        icon: "assembly",
        matchers: ["assembl", "mont", "bench", "banco", "fitting"],
        focusAreas: ["Bilanciamento linee", "Premontaggio kit", "Riduzione attese"],
        machines: [
            {
                name: "Banco modulare servoassistito",
                code: "AS-115",
                icon: "assembly",
                description:
                    "Postazione per montaggio seriale con controllo coppia e check qualità in linea.",
                powerKw: 9,
                throughputPerHour: 22,
                footprint: "5.2 x 2.4 m",
                precision: "0.3 mm",
                acquisitionDate: "2020-09-16",
                bookValueEur: 72000,
                depreciationProgress: 64,
                baseWorkedHours: 14320,
                baseUtilization: 64,
                baseEfficiency: 86,
                operatorSlots: 3,
                lastServiceDate: "2026-01-28",
                nextServiceDate: "2026-05-02",
                hoursUntilService: 74,
                tags: ["Torque", "Checklist", "Premontaggio"],
            },
            {
                name: "Robot pick-and-place",
                code: "RB-44",
                icon: "robot",
                description:
                    "Cella robotizzata per movimentazione componenti e supporto ai cicli ripetitivi.",
                powerKw: 12,
                throughputPerHour: 30,
                footprint: "4.8 x 3.1 m",
                precision: "0.4 mm",
                acquisitionDate: "2023-04-08",
                bookValueEur: 118000,
                depreciationProgress: 28,
                baseWorkedHours: 5120,
                baseUtilization: 54,
                baseEfficiency: 91,
                operatorSlots: 1,
                lastServiceDate: "2026-03-14",
                nextServiceDate: "2026-06-28",
                hoursUntilService: 148,
                tags: ["Robotica", "Movimentazione", "Preset"],
            },
        ],
    },
    {
        id: "verniciatura",
        name: "Finitura e Verniciatura",
        shortLabel: "Finish",
        description:
            "Cabine e linee di finitura per controllo superfici, tonalita e cadenza uscita pezzi.",
        accentColor: "#ec4899",
        icon: "paint",
        matchers: ["vernic", "finit", "paint", "coating", "lacc"],
        focusAreas: ["Uniformita colore", "Tempi di asciugatura", "Qualita superfici"],
        machines: [
            {
                name: "Cabina pressurizzata",
                code: "VN-62",
                icon: "paint",
                description:
                    "Cabina di verniciatura con controllo flussi e gestione ricette colore.",
                powerKw: 16,
                throughputPerHour: 18,
                footprint: "7.1 x 4.2 m",
                precision: "Ricetta digitale",
                acquisitionDate: "2019-02-21",
                bookValueEur: 105000,
                depreciationProgress: 71,
                baseWorkedHours: 16480,
                baseUtilization: 61,
                baseEfficiency: 82,
                operatorSlots: 2,
                lastServiceDate: "2026-02-08",
                nextServiceDate: "2026-04-24",
                hoursUntilService: 36,
                tags: ["Cabina", "Filtro aria", "Ricette"],
            },
            {
                name: "Forno di essiccazione",
                code: "DR-30",
                icon: "paint",
                description:
                    "Tunnel di asciugatura per cicli rapidi con curva termica monitorata.",
                powerKw: 21,
                throughputPerHour: 20,
                footprint: "9.5 x 2.9 m",
                precision: "0.5 C",
                acquisitionDate: "2020-07-11",
                bookValueEur: 87000,
                depreciationProgress: 59,
                baseWorkedHours: 13360,
                baseUtilization: 57,
                baseEfficiency: 80,
                operatorSlots: 1,
                lastServiceDate: "2026-01-22",
                nextServiceDate: "2026-05-15",
                hoursUntilService: 58,
                tags: ["Essiccazione", "Cura termica", "Controllo temperatura"],
            },
        ],
    },
    {
        id: "qualita",
        name: "Controllo Qualita",
        shortLabel: "Quality",
        description:
            "Verifica finale delle lavorazioni con rilievi dimensionali e checklist di conformita.",
        accentColor: "#14b8a6",
        icon: "quality",
        matchers: ["qualita", "quality", "qc", "controllo", "collaudo", "test"],
        focusAreas: ["Checklist uscita", "Tracciabilita difetti", "Collaudi finali"],
        machines: [
            {
                name: "Banco collaudo digitale",
                code: "QC-19",
                icon: "quality",
                description:
                    "Postazione con strumenti digitali per controlli dimensionali e funzionali.",
                powerKw: 6,
                throughputPerHour: 28,
                footprint: "3.6 x 2.2 m",
                precision: "0.05 mm",
                acquisitionDate: "2021-10-06",
                bookValueEur: 54000,
                depreciationProgress: 46,
                baseWorkedHours: 6920,
                baseUtilization: 49,
                baseEfficiency: 93,
                operatorSlots: 2,
                lastServiceDate: "2026-03-20",
                nextServiceDate: "2026-07-10",
                hoursUntilService: 174,
                tags: ["Collaudo", "Checklist", "Misurazione"],
            },
            {
                name: "Scanner difetti superficie",
                code: "VS-07",
                icon: "quality",
                description:
                    "Rilievo ottico per rilevare imperfezioni e supportare l'uscita lotto.",
                powerKw: 4,
                throughputPerHour: 34,
                footprint: "2.8 x 1.6 m",
                precision: "Visione HD",
                acquisitionDate: "2024-01-19",
                bookValueEur: 39000,
                depreciationProgress: 18,
                baseWorkedHours: 2160,
                baseUtilization: 45,
                baseEfficiency: 95,
                operatorSlots: 1,
                lastServiceDate: "2026-02-27",
                nextServiceDate: "2026-08-02",
                hoursUntilService: 210,
                tags: ["Visione", "Difetti", "Report"],
            },
        ],
    },
    {
        id: "imballaggio",
        name: "Imballaggio",
        shortLabel: "Pack",
        description:
            "Preparazione colli, protezioni e documenti di spedizione prima dell'uscita.",
        accentColor: "#f59e0b",
        icon: "packaging",
        matchers: ["imbal", "pack", "boxing", "sped", "shipping"],
        focusAreas: ["Preparazione colli", "Documenti spedizione", "Riduzione danni"],
        machines: [
            {
                name: "Linea confezionamento",
                code: "PK-51",
                icon: "packaging",
                description:
                    "Linea semi-automatica per confezionamento e protezione componenti finiti.",
                powerKw: 11,
                throughputPerHour: 36,
                footprint: "6.7 x 2.8 m",
                precision: "Preset taglio film",
                acquisitionDate: "2022-03-09",
                bookValueEur: 69000,
                depreciationProgress: 39,
                baseWorkedHours: 7640,
                baseUtilization: 60,
                baseEfficiency: 87,
                operatorSlots: 2,
                lastServiceDate: "2026-02-11",
                nextServiceDate: "2026-05-08",
                hoursUntilService: 84,
                tags: ["Film", "Protezione", "Etichette"],
            },
            {
                name: "Stazione etichettatura",
                code: "LB-13",
                icon: "logistics",
                description:
                    "Modulo per etichette di collo, distinta e verifica documentale di uscita.",
                powerKw: 3,
                throughputPerHour: 54,
                footprint: "2.1 x 1.2 m",
                precision: "Serializzazione",
                acquisitionDate: "2023-06-14",
                bookValueEur: 22000,
                depreciationProgress: 24,
                baseWorkedHours: 3980,
                baseUtilization: 51,
                baseEfficiency: 92,
                operatorSlots: 1,
                lastServiceDate: "2026-03-07",
                nextServiceDate: "2026-06-21",
                hoursUntilService: 132,
                tags: ["Etichette", "Tracking", "DDT"],
            },
        ],
    },
    {
        id: "logistica",
        name: "Logistica Interna",
        shortLabel: "Logistic",
        description:
            "Smistamento, staging e alimentazione dei reparti in base alle urgenze di commessa.",
        accentColor: "#8b5cf6",
        icon: "warehouse",
        matchers: ["logist", "magazz", "warehouse", "staging", "buffer"],
        focusAreas: ["Rifornimento reparti", "FIFO materiali", "Staging commesse"],
        machines: [
            {
                name: "Navetta automatizzata",
                code: "LG-80",
                icon: "logistics",
                description:
                    "Trasferimento WIP e semilavorati tra reparti con priorita dinamica.",
                powerKw: 7,
                throughputPerHour: 48,
                footprint: "10.0 x 1.8 m",
                precision: "Tracking RFID",
                acquisitionDate: "2021-12-02",
                bookValueEur: 58000,
                depreciationProgress: 44,
                baseWorkedHours: 8880,
                baseUtilization: 56,
                baseEfficiency: 89,
                operatorSlots: 1,
                lastServiceDate: "2026-02-25",
                nextServiceDate: "2026-05-29",
                hoursUntilService: 110,
                tags: ["RFID", "WIP", "Movimentazione"],
            },
            {
                name: "Torre picking verticale",
                code: "WH-27",
                icon: "warehouse",
                description:
                    "Picking assistito di componenti e kit con suggerimenti di prelievo.",
                powerKw: 8,
                throughputPerHour: 42,
                footprint: "4.2 x 3.5 m",
                precision: "LED pick-to-light",
                acquisitionDate: "2020-01-24",
                bookValueEur: 81000,
                depreciationProgress: 67,
                baseWorkedHours: 12140,
                baseUtilization: 59,
                baseEfficiency: 85,
                operatorSlots: 2,
                lastServiceDate: "2026-03-12",
                nextServiceDate: "2026-06-05",
                hoursUntilService: 96,
                tags: ["Picking", "Kit", "Buffer"],
            },
        ],
    },
];

const FALLBACK_COLORS = [
    "#0ea5e9",
    "#ef4444",
    "#22c55e",
    "#f97316",
    "#8b5cf6",
    "#eab308",
];

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function safeLabel(value: string): string {
    return value.replace(/[^a-zA-Z0-9 ]/g, "").trim().slice(0, 20) || "Factory";
}

function createSvgDataUrl(
    title: string,
    accentColor: string,
    secondaryColor: string,
): string {
    const safeTitle = safeLabel(title);
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.95" />
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.95" />
    </linearGradient>
  </defs>
  <rect width="1200" height="720" rx="48" fill="url(#bg)" />
  <circle cx="980" cy="132" r="118" fill="rgba(255,255,255,0.12)" />
  <circle cx="188" cy="604" r="164" fill="rgba(15,23,42,0.22)" />
  <rect x="96" y="118" width="448" height="284" rx="28" fill="rgba(15,23,42,0.18)" />
  <rect x="126" y="156" width="212" height="28" rx="14" fill="rgba(255,255,255,0.34)" />
  <rect x="126" y="208" width="272" height="18" rx="9" fill="rgba(255,255,255,0.18)" />
  <rect x="126" y="240" width="188" height="18" rx="9" fill="rgba(255,255,255,0.18)" />
  <rect x="642" y="208" width="360" height="228" rx="34" fill="rgba(255,255,255,0.14)" />
  <rect x="686" y="258" width="126" height="126" rx="18" fill="rgba(15,23,42,0.24)" />
  <rect x="834" y="258" width="126" height="126" rx="18" fill="rgba(15,23,42,0.24)" />
  <rect x="274" y="468" width="652" height="86" rx="22" fill="rgba(15,23,42,0.2)" />
  <text x="126" y="522" fill="white" font-size="74" font-family="Arial, Helvetica, sans-serif" font-weight="700">${safeTitle}</text>
  <text x="126" y="576" fill="rgba(255,255,255,0.74)" font-size="28" font-family="Arial, Helvetica, sans-serif">Factory operations overview</text>
</svg>`;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function chooseTemplate(seed: FactoryDepartmentSeed): {
    template: FactoryDepartmentTemplate;
    source: FactoryMockSource;
} {
    const haystack = `${seed.kanbanName} ${seed.kanbanIdentifier}`.toLowerCase();
    const matchedTemplate = FACTORY_DEPARTMENT_TEMPLATES.find((template) =>
        template.matchers.some((matcher) => haystack.includes(matcher)),
    );

    if (matchedTemplate) {
        return {
            template: matchedTemplate,
            source: {
                type: "mock",
                templateId: matchedTemplate.id,
                matchedBy: "matcher",
            },
        };
    }

    const fallbackColor = FALLBACK_COLORS[seed.kanbanId % FALLBACK_COLORS.length];
    return {
        template: {
            id: `custom-${seed.kanbanId}`,
            name: seed.kanbanName,
            shortLabel: seed.kanbanName.slice(0, 10) || "Factory",
            description:
                "Reparto derivato automaticamente dai dati produzione attuali, pronto per essere collegato a entita reali.",
            accentColor: fallbackColor,
            icon: "cnc",
            matchers: [],
            focusAreas: ["Schedulazione", "Saturazione linea", "Priorita commesse"],
            machines: [
                {
                    name: `${seed.kanbanName} Cell 01`,
                    code: `FX-${seed.kanbanId}-A`,
                    icon: "cnc",
                    description:
                        "Macchinario placeholder tipizzato per rappresentare la linea principale del reparto.",
                    powerKw: 14,
                    throughputPerHour: 20,
                    footprint: "5.0 x 3.0 m",
                    precision: "0.3 mm",
                    acquisitionDate: "2022-01-10",
                    bookValueEur: 64000,
                    depreciationProgress: 38,
                    baseWorkedHours: 6120,
                    baseUtilization: 52,
                    baseEfficiency: 83,
                    operatorSlots: 2,
                    lastServiceDate: "2026-02-12",
                    nextServiceDate: "2026-05-28",
                    hoursUntilService: 98,
                    tags: ["Placeholder", "Tipizzato", "Reparto"],
                },
                {
                    name: `${seed.kanbanName} Cell 02`,
                    code: `FX-${seed.kanbanId}-B`,
                    icon: "robot",
                    description:
                        "Seconda risorsa di reparto, progettata per accogliere futuri dati backend dedicati.",
                    powerKw: 11,
                    throughputPerHour: 16,
                    footprint: "4.4 x 2.8 m",
                    precision: "0.4 mm",
                    acquisitionDate: "2023-02-03",
                    bookValueEur: 53000,
                    depreciationProgress: 23,
                    baseWorkedHours: 3920,
                    baseUtilization: 48,
                    baseEfficiency: 86,
                    operatorSlots: 1,
                    lastServiceDate: "2026-03-04",
                    nextServiceDate: "2026-06-18",
                    hoursUntilService: 140,
                    tags: ["Mock", "Scalabile", "Factory"],
                },
            ],
        },
        source: {
            type: "mock",
            templateId: `custom-${seed.kanbanId}`,
            matchedBy: "fallback",
        },
    };
}

function getMachineStatus(
    hoursUntilService: number,
    utilization: number,
    activeOperators: number,
): FactoryMachineStatus {
    if (hoursUntilService <= 40) {
        return "manutenzione";
    }
    if (activeOperators === 0) {
        return "standby";
    }
    if (utilization <= 52) {
        return "setup";
    }
    return "operativa";
}

function materializeMachine(
    template: FactoryMachineTemplate,
    seed: FactoryDepartmentSeed,
    source: FactoryMockSource,
    accentColor: string,
    secondaryColor: string,
    index: number,
): FactoryMachineMeta {
    const flowTotal = seed.waiting + seed.inProgress + seed.delivered;
    const loadFactor = flowTotal > 0
        ? (seed.inProgress * 1.1 + seed.waiting * 0.65 + seed.delivered * 0.25) /
            flowTotal
        : 0.45;
    const normalizedLoad = clamp(loadFactor, 0.25, 0.95);
    const utilization = clamp(
        Math.round(template.baseUtilization + normalizedLoad * 18 + index * 3),
        24,
        98,
    );
    const efficiency = clamp(
        Math.round(
            template.baseEfficiency + (seed.delayed === 0 ? 4 : -Math.min(seed.delayed, 8)),
        ),
        58,
        99,
    );
    const activeOperators = seed.jobs === 0
        ? 0
        : clamp(
            Math.round(seed.activeOperators / Math.max(1, index + 2)),
            1,
            template.operatorSlots,
        );
    const workedHours = template.baseWorkedHours + seed.items * (index + 2) * 5;
    const hoursUntilService = clamp(
        template.hoursUntilService - seed.inProgress * 4 - index * 6,
        8,
        240,
    );
    const status = getMachineStatus(hoursUntilService, utilization, activeOperators);

    return {
        id: `${seed.kanbanIdentifier || seed.kanbanId}-${template.code}`.toLowerCase(),
        name: template.name,
        code: template.code,
        description: template.description,
        imageUrl: createSvgDataUrl(template.name, accentColor, secondaryColor),
        icon: template.icon,
        status,
        utilization,
        efficiency,
        operatorSlots: template.operatorSlots,
        activeOperators,
        workedHours,
        acquisitionDate: template.acquisitionDate,
        bookValueEur: template.bookValueEur,
        depreciationProgress: template.depreciationProgress,
        technical: {
            powerKw: template.powerKw,
            throughputPerHour: template.throughputPerHour,
            footprint: template.footprint,
            precision: template.precision,
        },
        maintenance: {
            lastServiceDate: template.lastServiceDate,
            nextServiceDate: template.nextServiceDate,
            hoursUntilService,
        },
        tags: template.tags,
        source,
    };
}

export function resolveFactoryDepartmentMeta(
    seed: FactoryDepartmentSeed,
): FactoryDepartmentMeta {
    const { template, source } = chooseTemplate(seed);
    const accentColor = seed.color || template.accentColor;
    const secondaryColor = `${accentColor}99`;

    return {
        id: template.id,
        name: template.name || seed.kanbanName,
        shortLabel: template.shortLabel,
        description: template.description,
        coverImage: createSvgDataUrl(seed.kanbanName, accentColor, secondaryColor),
        icon: template.icon,
        accentColor,
        focusAreas: template.focusAreas,
        machines: template.machines.map((machine, index) =>
            materializeMachine(
                machine,
                seed,
                source,
                accentColor,
                secondaryColor,
                index,
            )
        ),
        source,
    };
}
