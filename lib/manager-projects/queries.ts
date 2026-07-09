// Query server-side per la board progetti del super-admin.
// Usa il client di sessione: le RLS di manager_projects espongono i dati
// solo al superadmin (guard applicativo comunque presente nelle pagine).

import { createClient } from "@/utils/supabase/server";
import type {
  ManagerProjectSummary,
  ProjectStage,
  ProjectStageEvent,
} from "./types";

interface ProjectRow {
  id: string;
  site_id: string;
  stage: ProjectStage;
  board_order: number;
  notes: string | null;
  metadata: Record<string, unknown>;
  stage_changed_at: string;
  created_at: string;
  updated_at: string;
  sites: {
    name: string;
    subdomain: string | null;
    logo: string | null;
    organizations: { name: string } | null;
  } | null;
}

interface HoursRow {
  project_id: string;
  employee_id: number | null;
  total_minutes: number | null;
}

export async function fetchManagerProjects(): Promise<ManagerProjectSummary[]> {
  const supabase = await createClient();

  const [projectsRes, hoursRes] = await Promise.all([
    supabase
      .from("manager_projects")
      .select(
        "id, site_id, stage, board_order, notes, metadata, stage_changed_at, created_at, updated_at, sites(name, subdomain, logo, organizations(name))"
      )
      .order("board_order", { ascending: true }),
    supabase
      .from("manager_project_hours")
      .select("project_id, employee_id, total_minutes"),
  ]);

  if (projectsRes.error) {
    throw new Error(`Caricamento progetti fallito: ${projectsRes.error.message}`);
  }

  // Le ore sono opzionali: se la vista fallisse la board resta usabile.
  const hoursByProject = new Map<
    string,
    { minutes: number; employees: Set<number> }
  >();
  if (!hoursRes.error) {
    for (const row of (hoursRes.data || []) as HoursRow[]) {
      const agg = hoursByProject.get(row.project_id) || {
        minutes: 0,
        employees: new Set<number>(),
      };
      agg.minutes += row.total_minutes || 0;
      if (row.employee_id !== null) agg.employees.add(row.employee_id);
      hoursByProject.set(row.project_id, agg);
    }
  }

  return ((projectsRes.data || []) as unknown as ProjectRow[]).map((row) => {
    const hours = hoursByProject.get(row.id);
    return {
      id: row.id,
      site_id: row.site_id,
      stage: row.stage,
      board_order: row.board_order,
      notes: row.notes,
      metadata: row.metadata || {},
      stage_changed_at: row.stage_changed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      site: {
        name: row.sites?.name || "Sito sconosciuto",
        subdomain: row.sites?.subdomain ?? null,
        logo: row.sites?.logo ?? null,
        organization_name: row.sites?.organizations?.name ?? null,
      },
      total_minutes: hours?.minutes,
      collaborators_count: hours ? hours.employees.size : undefined,
    };
  });
}

export async function fetchManagerProject(
  projectId: string
): Promise<ManagerProjectSummary | null> {
  const projects = await fetchManagerProjects();
  return projects.find((p) => p.id === projectId) || null;
}

export interface ProjectHoursDetailRow {
  employee_id: number | null;
  employee_label: string;
  month: string;
  total_minutes: number;
  entries_count: number;
}

/** Ore per collaboratore/mese, con nome risolto dalla tabella User. */
export async function fetchProjectHoursDetail(
  projectId: string
): Promise<ProjectHoursDetailRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("manager_project_hours")
    .select("employee_id, month, total_minutes, entries_count")
    .eq("project_id", projectId)
    .order("month", { ascending: false });

  if (error || !data) return [];

  const employeeIds = Array.from(
    new Set(
      data.map((r) => r.employee_id).filter((id): id is number => id !== null)
    )
  );
  const nameById = new Map<number, string>();
  if (employeeIds.length > 0) {
    const { data: users } = await supabase
      .from("User")
      .select("id, given_name, family_name, email")
      .in("id", employeeIds);
    for (const u of users || []) {
      const fullName = [u.given_name, u.family_name].filter(Boolean).join(" ");
      nameById.set(u.id, fullName || u.email);
    }
  }

  return data.map((r) => ({
    employee_id: r.employee_id,
    employee_label:
      r.employee_id !== null
        ? nameById.get(r.employee_id) || `Collaboratore #${r.employee_id}`
        : "Sconosciuto",
    month: r.month,
    total_minutes: r.total_minutes || 0,
    entries_count: r.entries_count || 0,
  }));
}

export interface ProjectStageEventWithAuthor extends ProjectStageEvent {
  changed_by_label: string | null;
}

export async function fetchProjectStageEvents(
  projectId: string
): Promise<ProjectStageEventWithAuthor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("manager_project_stage_events")
    .select("id, project_id, from_stage, to_stage, changed_by, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  const authorIds = Array.from(
    new Set(
      data.map((e) => e.changed_by).filter((id): id is string => Boolean(id))
    )
  );
  const labelByAuthId = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: users } = await supabase
      .from("User")
      .select("authId, given_name, family_name, email")
      .in("authId", authorIds);
    for (const u of users || []) {
      if (!u.authId) continue;
      const fullName = [u.given_name, u.family_name].filter(Boolean).join(" ");
      labelByAuthId.set(u.authId, fullName || u.email);
    }
  }

  return (data as ProjectStageEvent[]).map((e) => ({
    ...e,
    changed_by_label: e.changed_by
      ? labelByAuthId.get(e.changed_by) || null
      : null,
  }));
}
