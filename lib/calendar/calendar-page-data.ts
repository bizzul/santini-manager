import { createClient } from "@/utils/supabase/server";
import { fetchSiteModules } from "@/lib/server-data";
import type { CalendarPhase } from "@/lib/calendar/mapTaskToEvents";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export const CALENDAR_V2_MODULE = "calendar_v2";

export async function isCalendarV2Enabled(siteId: string): Promise<boolean> {
  const modules = await fetchSiteModules(siteId);
  return modules.some((module) => module.name === CALENDAR_V2_MODULE && module.isEnabled);
}

type AssignableTask = {
  assigned_collaborator_ids?: unknown;
  produzione_collaborator_ids?: unknown;
  posa_collaborator_ids?: unknown;
  service_collaborator_ids?: unknown;
};

function toIdList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

/** Stessa regola dell'Area collaboratore: assegnati al progetto + alla fase. */
export function getPhaseCollaboratorIds(task: AssignableTask, phase: CalendarPhase): string[] {
  const phaseIds =
    phase === "installation"
      ? toIdList(task.posa_collaborator_ids)
      : phase === "service"
        ? toIdList(task.service_collaborator_ids)
        : toIdList(task.produzione_collaborator_ids);
  return Array.from(new Set([...toIdList(task.assigned_collaborator_ids), ...phaseIds]));
}

/**
 * Calendario v2: gli avatar sulle card sono i collaboratori assegnati
 * (`*_collaborator_ids`, id `User.id`) invece di chi ha registrato ore.
 */
export async function applyAssignedCollaborators<T extends AssignableTask>(
  tasks: T[],
  phase: CalendarPhase
): Promise<Array<T & { projectCollaborators: AssignedCollaborator[] }>> {
  const idsByTask = tasks.map((task) => getPhaseCollaboratorIds(task, phase));
  const allIds = Array.from(new Set(idsByTask.flat())).filter((id) => /^\d+$/.test(id));

  const usersById = new Map<string, AssignedCollaborator>();
  if (allIds.length > 0) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("User")
      .select("id, authId, given_name, family_name, initials, picture")
      .in("id", allIds.map(Number));
    if (error) {
      console.error("Error fetching assigned collaborators for calendar:", error);
    }
    (data || []).forEach((user) => usersById.set(String(user.id), user));
  }

  return tasks.map((task, index) => ({
    ...task,
    projectCollaborators: idsByTask[index]
      .map((id) => usersById.get(id))
      .filter((user): user is AssignedCollaborator => Boolean(user)),
  }));
}

type AssignedCollaborator = {
  id: number | string;
  authId?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  initials?: string | null;
  picture?: string | null;
};

/**
 * Id delle colonne finali (posizione massima) per ciascun Kanban. Serve al
 * chip "In ritardo" delle scadenze di produzione. Sola lettura.
 */
export async function fetchFinalColumnIds(
  supabase: ServerSupabase,
  kanbanIds: number[]
): Promise<Set<number>> {
  const finalIds = new Set<number>();
  if (kanbanIds.length === 0) return finalIds;

  const { data, error } = await supabase
    .from("KanbanColumn")
    .select("id, kanbanId, position")
    .in("kanbanId", kanbanIds);

  if (error || !data) {
    console.error("Error fetching kanban columns for calendar:", error);
    return finalIds;
  }

  const lastByKanban = new Map<number, { id: number; position: number }>();
  data.forEach((column) => {
    const current = lastByKanban.get(column.kanbanId);
    if (!current || column.position > current.position) {
      lastByKanban.set(column.kanbanId, { id: column.id, position: column.position });
    }
  });
  lastByKanban.forEach((column) => finalIds.add(column.id));
  return finalIds;
}
