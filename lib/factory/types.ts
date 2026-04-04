export type FactoryMachineStatus =
    | "operativa"
    | "setup"
    | "manutenzione"
    | "standby";

export type FactoryMachineIcon =
    | "laser"
    | "cnc"
    | "assembly"
    | "paint"
    | "warehouse"
    | "quality"
    | "packaging"
    | "logistics"
    | "robot";

export interface FactoryMockSource {
    type: "mock";
    templateId: string;
    matchedBy: "matcher" | "fallback";
}

export interface FactoryMachineTechnicalSpecs {
    powerKw: number;
    throughputPerHour: number;
    footprint: string;
    precision: string;
}

export interface FactoryMaintenanceInfo {
    lastServiceDate: string;
    nextServiceDate: string;
    hoursUntilService: number;
}

export interface FactoryMachineMeta {
    id: string;
    name: string;
    code: string;
    description: string;
    imageUrl: string;
    icon: FactoryMachineIcon;
    status: FactoryMachineStatus;
    utilization: number;
    efficiency: number;
    operatorSlots: number;
    activeOperators: number;
    workedHours: number;
    acquisitionDate: string;
    bookValueEur: number;
    depreciationProgress: number;
    technical: FactoryMachineTechnicalSpecs;
    maintenance: FactoryMaintenanceInfo;
    tags: string[];
    source: FactoryMockSource;
}

export interface FactoryDepartmentMeta {
    id: string;
    name: string;
    shortLabel: string;
    description: string;
    coverImage: string;
    icon: FactoryMachineIcon;
    accentColor: string;
    focusAreas: string[];
    machines: FactoryMachineMeta[];
    source: FactoryMockSource;
}

export interface FactoryTaskPreview {
    id: number;
    uniqueCode: string | null;
    name: string;
    quantity: number;
    dueDate: string | null;
    statusLabel: string;
}

export interface FactoryDepartmentSeed {
    kanbanId: number;
    kanbanName: string;
    kanbanIdentifier: string;
    color: string;
    icon: string | null;
    jobs: number;
    items: number;
    delayed: number;
    waiting: number;
    inProgress: number;
    delivered: number;
    activeOperators: number;
}

export interface FactoryDepartmentData {
    id: string;
    kanbanId: number;
    kanbanIdentifier: string;
    kanbanName: string;
    color: string;
    icon: string | null;
    jobs: number;
    items: number;
    delayed: number;
    activeOperators: number;
    loadPercentage: number;
    flow: {
        waiting: number;
        inProgress: number;
        delivered: number;
    };
    tasks: FactoryTaskPreview[];
    machines: FactoryMachineMeta[];
    description: string;
    coverImage: string;
    departmentIcon: FactoryMachineIcon;
    focusAreas: string[];
    source: FactoryMockSource;
}

export interface FactoryDashboardOverview {
    departmentsCount: number;
    machinesCount: number;
    totalJobs: number;
    totalItems: number;
    delayedJobs: number;
    waiting: number;
    inProgress: number;
    delivered: number;
    activeOperators: number;
}

export interface FactoryDashboardData {
    departments: FactoryDepartmentData[];
    overview: FactoryDashboardOverview;
    updatedAt: string;
    productionCategoryName: string | null;
}
