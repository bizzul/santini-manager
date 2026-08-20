/**
 * Active workload + pipeline helpers for the FDM Overview dashboard.
 *
 * Shared by every tenant (Santini, Benicchio, …): "attivo" is derived from
 * kanban column type/title and display_mode, never from a hardcoded site.
 * Closed/paid/lost rows stay in the database; they are only excluded from
 * the "carico attuale" count, except AVOR which adds every board project
 * plus every won offer.
 */

export type OfferColumnStatus =
  | "todo"
  | "inviate"
  | "inTrattativa"
  | "vinte"
  | "perse";

export type InvoiceColumnStatus = "daInviare" | "inviate" | "pagata";

export type WorkloadLane = "vendita" | "fatturazione" | "operational";

export type WorkloadColumn = {
  id?: number | null;
  kanbanId?: number | null;
  title?: string | null;
  identifier?: string | null;
  column_type?: string | null;
  position?: number | null;
};

export type WorkloadKanban = {
  id?: number | null;
  title?: string | null;
  identifier?: string | null;
  icon?: string | null;
  color?: string | null;
  category_id?: number | null;
  is_offer_kanban?: boolean | null;
  is_work_kanban?: boolean | null;
  is_production_kanban?: boolean | null;
};

export type WorkloadCategory = {
  id?: number | null;
  name?: string | null;
  identifier?: string | null;
  icon?: string | null;
  color?: string | null;
};

export type DepartmentWorkloadRow = {
  department: string;
  count: number;
  icon?: string;
  color?: string;
};

export type WorkloadTask = {
  id?: number | null;
  unique_code?: string | null;
  archived?: boolean | null;
  display_mode?: string | null;
  kanbanId?: number | null;
  kanbanColumnId?: number | null;
  sellPrice?: number | null;
  created_at?: string | null;
  task_type?: string | null;
};

export type PipelinePoint = {
  month: string;
  value: number;
  isPartial: boolean;
};

const MONTH_LABELS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function normalizeWorkflowLabel(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function departmentNameFromKanban(
  kanban: WorkloadKanban | null | undefined,
): string {
  if (!kanban) return "Altro";
  if (kanban.is_offer_kanban) return "Vendita";

  const name = normalizeWorkflowLabel(
    `${kanban.title || ""} ${kanban.identifier || ""}`,
  );

  if (name.includes("avor") || name.includes("ufficio")) return "AVOR";
  if (
    name.includes("vendita") ||
    name.includes("offerta") ||
    name.includes("commerciale")
  ) {
    return "Vendita";
  }
  if (
    name.includes("produzione") ||
    name.includes("officina") ||
    name.includes("lavorazione") ||
    /\bprod\b/.test(name)
  ) {
    return "Prod.";
  }
  if (
    name.includes("fattur") ||
    name.includes("billing") ||
    name.includes("invoic")
  ) {
    return "Fatturazione";
  }
  if (
    name.includes("install") ||
    name.includes("montaggio") ||
    name.includes("cantiere")
  ) {
    return "Install.";
  }
  if (
    name.includes("service") ||
    name.includes("assistenza") ||
    name.includes("manutenzione")
  ) {
    return "Service";
  }

  const originalName = kanban.title || kanban.identifier || "";
  return originalName
    ? originalName.charAt(0).toUpperCase() + originalName.slice(1)
    : "Altro";
}

export function classifyOfferColumn(
  column: WorkloadColumn | null | undefined,
): OfferColumnStatus {
  const type = column?.column_type || "normal";
  if (type === "won") return "vinte";
  if (type === "lost") return "perse";
  const label = normalizeWorkflowLabel(
    `${column?.title || ""} ${column?.identifier || ""}`,
  );
  if (label.includes("inviat")) return "inviate";
  if (label.includes("trattativa") || label.includes("negoziazione")) {
    return "inTrattativa";
  }
  return "todo";
}

export function classifyInvoiceColumn(
  column: WorkloadColumn | null | undefined,
): InvoiceColumnStatus {
  const type = column?.column_type || "normal";
  const label = normalizeWorkflowLabel(
    `${column?.title || ""} ${column?.identifier || ""}`,
  );
  if (type === "won" || label.includes("pagat") || label.includes("paid")) {
    return "pagata";
  }
  if (label.includes("inviat")) return "inviate";
  return "daInviare";
}

export function isTerminalOperationalColumn(
  column: WorkloadColumn | null | undefined,
): boolean {
  const type = column?.column_type || "normal";
  if (type === "won" || type === "lost" || type === "invoicing") return true;
  const label = normalizeWorkflowLabel(
    `${column?.title || ""} ${column?.identifier || ""}`,
  );
  return (
    label.includes("spedito") ||
    label.includes("ultimato") ||
    label.includes("completat") ||
    label.includes("consegnat") ||
    label.includes("chius") ||
    label.includes("pagat") ||
    label.includes("collaudo") ||
    label.includes("annullat") ||
    /\bvint[aeo]\b/.test(label) ||
    /\bpers[aeo]\b/.test(label)
  );
}

export function resolveOfferStatus(
  task: Pick<WorkloadTask, "display_mode" | "kanbanColumnId">,
  column: WorkloadColumn | null | undefined,
): OfferColumnStatus {
  if (task.display_mode === "small_green") return "vinte";
  if (task.display_mode === "small_red") return "perse";
  return classifyOfferColumn(column);
}

export function workloadLaneFromDepartment(department: string): WorkloadLane {
  if (department === "Vendita") return "vendita";
  if (department === "Fatturazione") return "fatturazione";
  return "operational";
}

export function isActiveWorkloadTask(
  task: WorkloadTask,
  column: WorkloadColumn | null | undefined,
  lane: WorkloadLane,
): boolean {
  if (task.archived === true) return false;

  if (lane === "vendita") {
    const status = resolveOfferStatus(task, column);
    return status === "inviate" || status === "inTrattativa";
  }

  if (lane === "fatturazione") {
    return classifyInvoiceColumn(column) === "daInviare";
  }

  if (
    task.display_mode === "small_green" ||
    task.display_mode === "small_red"
  ) {
    return false;
  }
  return !isTerminalOperationalColumn(column);
}

export function baseProjectNumber(code: unknown): string {
  const value = String(code || "");
  const match = value.match(/^\d{2}-\d{3}/);
  return match ? match[0] : value;
}

export function workloadProjectKey(task: WorkloadTask): string {
  const base = baseProjectNumber(task.unique_code);
  if (base) return `${task.kanbanColumnId ?? ""}::${base}`;
  return String(task.id ?? "");
}

/** Unique project identity, independent of column (one card per commessa). */
export function uniqueProjectKey(task: WorkloadTask): string {
  const base = baseProjectNumber(task.unique_code);
  if (base) return base;
  return String(task.id ?? "");
}

export function isAvorDepartment(department: string): boolean {
  return department === "AVOR";
}

/**
 * Unique-project count for Fatturazione (matches Overview KPI "Da inviare").
 * Per-card count for Vendita (matches KPI Inviate + Trattativa).
 * AVOR = every project on the AVOR board + every won offer.
 * Unique-project count for every other board (active columns only).
 */
export function countActiveWorkload(params: {
  tasks: WorkloadTask[];
  getDepartment: (kanbanId: number | null) => string;
  getColumn: (columnId: number | null | undefined) => WorkloadColumn | undefined;
}): Array<{ department: string; count: number }> {
  const venditaCount = { current: 0 };
  const fatturazioneKeys = new Set<string>();
  const avorBoardKeys = new Set<string>();
  const wonOfferKeys = new Set<string>();
  const operationalKeys = new Map<string, Set<string>>();

  for (const task of params.tasks) {
    if (task.archived === true) continue;

    const department = params.getDepartment(task.kanbanId ?? null);
    const lane = workloadLaneFromDepartment(department);
    const column = params.getColumn(task.kanbanColumnId);

    if (lane === "vendita") {
      const status = resolveOfferStatus(task, column);
      if (status === "inviate" || status === "inTrattativa") {
        venditaCount.current += 1;
      } else if (status === "vinte") {
        wonOfferKeys.add(uniqueProjectKey(task));
      }
      continue;
    }

    if (isAvorDepartment(department)) {
      avorBoardKeys.add(uniqueProjectKey(task));
      continue;
    }

    if (!isActiveWorkloadTask(task, column, lane)) continue;

    if (lane === "fatturazione") {
      fatturazioneKeys.add(workloadProjectKey(task));
      continue;
    }
    let set = operationalKeys.get(department);
    if (!set) {
      set = new Set<string>();
      operationalKeys.set(department, set);
    }
    set.add(workloadProjectKey(task));
  }

  const rows: Array<{ department: string; count: number }> = [];
  if (venditaCount.current > 0) {
    rows.push({ department: "Vendita", count: venditaCount.current });
  }
  const avorCount = avorBoardKeys.size + wonOfferKeys.size;
  if (avorCount > 0) {
    rows.push({ department: "AVOR", count: avorCount });
  }
  if (fatturazioneKeys.size > 0) {
    rows.push({ department: "Fatturazione", count: fatturazioneKeys.size });
  }
  for (const [department, keys] of Array.from(operationalKeys.entries())) {
    if (department === "AVOR") continue;
    if (keys.size > 0) rows.push({ department, count: keys.size });
  }
  return rows.sort((a, b) => b.count - a.count);
}

const DEFAULT_DEPARTMENT_ICON = "Folder";
const DEFAULT_DEPARTMENT_COLOR = "#3B82F6";

function visualFrom(
  source: { icon?: string | null; color?: string | null } | null | undefined,
): { icon: string; color: string } | null {
  if (!source) return null;
  const icon = String(source.icon || "").trim();
  const color = String(source.color || "").trim();
  if (!icon && !color) return null;
  return {
    icon: icon || DEFAULT_DEPARTMENT_ICON,
    color: color || DEFAULT_DEPARTMENT_COLOR,
  };
}

/**
 * Resolves the same Lucide icon + area color used in the kanban sidebar.
 * Prefers the sidebar category (area), then an exact board title, then the
 * first kanban that maps to that department name.
 */
export function resolveDepartmentVisual(
  department: string,
  kanbans: WorkloadKanban[],
  categories: WorkloadCategory[] = [],
): { icon: string; color: string } {
  const wanted = normalizeWorkflowLabel(department);

  const category = categories.find(
    (item) =>
      normalizeWorkflowLabel(item.name) === wanted ||
      normalizeWorkflowLabel(item.identifier) === wanted,
  );
  const fromCategory = visualFrom(category);
  if (fromCategory) return fromCategory;

  const titledBoard = kanbans.find(
    (kanban) =>
      normalizeWorkflowLabel(kanban.title) === wanted ||
      normalizeWorkflowLabel(kanban.identifier) === wanted,
  );
  const fromBoard = visualFrom(titledBoard);
  if (fromBoard) return fromBoard;

  const mappedBoard = kanbans.find(
    (kanban) => departmentNameFromKanban(kanban) === department,
  );
  const fromMapped = visualFrom(mappedBoard);
  if (fromMapped) return fromMapped;

  return { icon: DEFAULT_DEPARTMENT_ICON, color: DEFAULT_DEPARTMENT_COLOR };
}

export function attachDepartmentVisuals(
  rows: Array<{ department: string; count: number }>,
  kanbans: WorkloadKanban[],
  categories: WorkloadCategory[] = [],
): DepartmentWorkloadRow[] {
  return rows.map((row) => ({
    ...row,
    ...resolveDepartmentVisual(row.department, kanbans, categories),
  }));
}

export function isCurrentCalendarMonthPartial(now: Date = new Date()): boolean {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return now.getDate() < lastDay;
}

export function pipelineMonthKey(date: Date): string {
  return `${MONTH_LABELS_EN[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
}

export function buildPipelineSeries(params: {
  now?: Date;
  months?: number;
  tasks: Array<Pick<WorkloadTask, "created_at" | "sellPrice" | "kanbanId" | "task_type">>;
  isOfferTask: (task: Pick<WorkloadTask, "kanbanId" | "task_type">) => boolean;
}): PipelinePoint[] {
  const now = params.now ?? new Date();
  const months = params.months ?? 6;
  const series = new Map<string, PipelinePoint>();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = pipelineMonthKey(date);
    const isPartial =
      i === 0 && isCurrentCalendarMonthPartial(now);
    series.set(key, { month: key, value: 0, isPartial });
  }

  for (const task of params.tasks) {
    if (!params.isOfferTask(task)) continue;
    if (!task.created_at) continue;
    const created = new Date(task.created_at);
    if (Number.isNaN(created.getTime())) continue;
    const key = pipelineMonthKey(created);
    const point = series.get(key);
    if (!point) continue;
    point.value += Number(task.sellPrice) || 0;
  }

  return Array.from(series.values());
}
