/**
 * Read-only aggregation of open activities for the Command Deck
 * "Attività aperte" view. Composes existing data shapes only.
 */

import { COMMAND_DECK_NODES } from "./nodes";
import { buildModuleHref } from "./routes";
import {
  buildOrbitSet,
  makeOrbitItem,
  type OrbitGroups,
  type OrbitItem,
} from "./orbit-items";

export interface ActivityCountsByModule {
  [moduleId: string]: number;
}

export interface ActivitiesPayload {
  activities: OrbitItem[];
  countsByModule: ActivityCountsByModule;
  total: number;
}

const MODULE_COLORS = Object.fromEntries(
  COMMAND_DECK_NODES.map((n) => [n.id, n.color]),
) as Record<string, string>;

const MODULE_LABELS = Object.fromEntries(
  COMMAND_DECK_NODES.map((n) => [n.id, n.label]),
) as Record<string, string>;

function parseIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v));
}

function isAssignedToUser(
  task: Record<string, unknown>,
  authUserId: string,
  numericUserId: number | null,
): boolean {
  const pools = [
    task.assigned_collaborator_ids,
    task.produzione_collaborator_ids,
    task.posa_collaborator_ids,
  ];
  for (const pool of pools) {
    const ids = parseIdArray(pool);
    if (ids.includes(authUserId)) return true;
    if (numericUserId !== null && ids.includes(String(numericUserId))) {
      return true;
    }
  }
  return false;
}

function isOpenTask(
  task: Record<string, unknown>,
  speditoColumnIds: Set<number | string>,
): boolean {
  if (task.archived === true) return false;
  const colId = task.kanbanColumnId;
  if (
    typeof colId === "string" ||
    typeof colId === "number"
  ) {
    if (speditoColumnIds.has(colId)) return false;
  }
  return true;
}

function resolveTaskModuleId(
  task: Record<string, unknown>,
  factoryKanbanIds: Set<number | string>,
): string {
  const kanbanId = task.kanbanId;
  if (
    (typeof kanbanId === "string" || typeof kanbanId === "number") &&
    factoryKanbanIds.has(kanbanId)
  ) {
    return "fabbrica";
  }
  return "progetti";
}

function buildTaskHref(
  domain: string,
  taskId: string | number,
  moduleId: string,
  userRole?: string | null,
): string {
  const base = `/sites/${domain}`;
  if (moduleId === "progetti") {
    if (userRole === "admin" || userRole === "superadmin") {
      return `${base}/progetti/${taskId}`;
    }
    return `${base}/projects?edit=${taskId}`;
  }
  return buildModuleHref(domain, moduleId) ?? `${base}/factory`;
}

export function normalizeOpenTasks(
  tasks: unknown[],
  opts: {
    domain: string;
    authUserId: string;
    numericUserId: number | null;
    userRole?: string | null;
    speditoColumnIds: Set<number | string>;
    factoryKanbanIds: Set<number | string>;
    filterByUser?: boolean;
  },
): OrbitItem[] {
  return tasks
    .filter((raw) => {
      const t = raw as Record<string, unknown>;
      if (!isOpenTask(t, opts.speditoColumnIds)) return false;
      if (opts.filterByUser && !isAssignedToUser(t, opts.authUserId, opts.numericUserId)) {
        return false;
      }
      return true;
    })
    .map((raw) => {
      const t = raw as Record<string, unknown> & {
        id?: number | string;
        name?: string | null;
        title?: string | null;
        unique_code?: string | null;
        deliveryDate?: string | null;
        Kanban?: { title?: string | null } | null;
        KanbanColumn?: { title?: string | null } | null;
      };
      const moduleId = resolveTaskModuleId(t, opts.factoryKanbanIds);
      const label =
        t.name || t.title || t.unique_code || `Task ${t.id ?? ""}`;
      const status =
        t.KanbanColumn?.title ?? t.Kanban?.title ?? "Aperto";

      return makeOrbitItem({
        id: `task-${t.id}`,
        label,
        category: MODULE_LABELS[moduleId] ?? moduleId,
        color: MODULE_COLORS[moduleId] ?? null,
        kind: "activity",
        moduleId,
        href: buildTaskHref(
          opts.domain,
          t.id!,
          moduleId,
          opts.userRole,
        ),
        status,
        dueDate: t.deliveryDate ?? null,
      });
    });
}

export function normalizePendingLeaveRequests(
  requests: unknown[],
  domain: string,
): OrbitItem[] {
  return (requests as Array<Record<string, unknown>>)
    .filter((r) => r.status === "pending")
    .map((r) => {
      const leaveType = String(r.leave_type ?? "ferie");
      const start = r.start_date ? String(r.start_date) : null;
      const end = r.end_date ? String(r.end_date) : null;
      const dateRange =
        start && end
          ? `${new Date(start).toLocaleDateString("it-IT")} – ${new Date(end).toLocaleDateString("it-IT")}`
          : null;
      const baseCategory = MODULE_LABELS.admin;

      return makeOrbitItem({
        id: `leave-${r.id}`,
        label: `Richiesta ${leaveType}`,
        category: dateRange ? `${baseCategory} · ${dateRange}` : baseCategory,
        color: MODULE_COLORS.admin,
        kind: "activity",
        moduleId: "admin",
        href: buildModuleHref(domain, "admin") ?? `/sites/${domain}/collaborators`,
        status: "In attesa",
        dueDate: start,
        imageUrl: null,
      });
    });
}

export function normalizeInventoryAlerts(
  alerts: unknown[],
  domain: string,
): OrbitItem[] {
  return (alerts as Array<Record<string, unknown>>).map((a) =>
    makeOrbitItem({
      id: `inv-alert-${a.id}`,
      label: String(a.message ?? "Alert inventario"),
      category: MODULE_LABELS.inventario,
      color: MODULE_COLORS.inventario,
      kind: "activity",
      moduleId: "inventario",
      href: buildModuleHref(domain, "inventario") ?? `/sites/${domain}/inventory`,
      status: String(a.priority ?? "medium"),
      dueDate: null,
    }),
  );
}

export function normalizeProductAlerts(
  alerts: unknown[],
  domain: string,
): OrbitItem[] {
  return (alerts as Array<Record<string, unknown>>).map((a) =>
    makeOrbitItem({
      id: `prod-alert-${a.id}`,
      label: String(a.message ?? "Alert prodotto"),
      category: MODULE_LABELS.prodotti,
      color: MODULE_COLORS.prodotti,
      kind: "activity",
      moduleId: "prodotti",
      href: buildModuleHref(domain, "prodotti") ?? `/sites/${domain}/products`,
      status: String(a.priority ?? "medium"),
      dueDate: null,
    }),
  );
}

export function buildActivitiesPayload(
  items: OrbitItem[],
): ActivitiesPayload {
  const countsByModule: ActivityCountsByModule = {};

  for (const item of items) {
    const mod = item.moduleId ?? "progetti";
    countsByModule[mod] = (countsByModule[mod] ?? 0) + 1;
  }

  return {
    activities: items,
    countsByModule,
    total: items.length,
  };
}

export function activitiesToOrbitGroups(
  payload: ActivitiesPayload,
): OrbitGroups {
  return {
    activities: buildOrbitSet(payload.activities),
  };
}
