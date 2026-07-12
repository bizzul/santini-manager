"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import type { ProjectStage } from "@/lib/manager-projects/types";

const VALID_STAGES: ProjectStage[] = [
  "alpha",
  "beta",
  "client_demo",
  "active",
];

/**
 * Sposta un progetto in un nuovo stage (drag tra colonne della board).
 * Scrive SOLO su manager_projects: lo storico è generato dal trigger DB e
 * nessuna tabella usata dagli spazi online viene toccata.
 */
export async function updateProjectStage(
  projectId: string,
  toStage: ProjectStage
): Promise<{ success: boolean; message?: string }> {
  const userContext = await getUserContext();
  if (!userContext || userContext.role !== "superadmin") {
    return { success: false, message: "Solo i superadmin possono spostare i progetti" };
  }
  if (!VALID_STAGES.includes(toStage)) {
    return { success: false, message: `Stage non valido: ${toStage}` };
  }

  const supabase = await createClient();

  // In coda alla colonna di destinazione.
  const { data: maxRow } = await supabase
    .from("manager_projects")
    .select("board_order")
    .eq("stage", toStage)
    .order("board_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("manager_projects")
    .update({
      stage: toStage,
      board_order: (maxRow?.board_order ?? 0) + 1,
    })
    .eq("id", projectId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/administration/projects");
  return { success: true };
}

/**
 * Registra ore dedicate a un progetto dal super-admin. Scrive una riga
 * standard in Timetracking (stesso modello dell'area collaboratore) con
 * site_id del progetto e activity_type 'internal' + internal_activity
 * 'gestione_progetto': così le ore di gestione FDM sono distinguibili e
 * filtrabili nei report dello spazio cliente.
 */
export async function logProjectHours(input: {
  projectId: string;
  hours: number;
  minutes: number;
  description?: string;
}): Promise<{ success: boolean; message?: string }> {
  const userContext = await getUserContext();
  if (!userContext || userContext.role !== "superadmin") {
    return { success: false, message: "Solo i superadmin possono registrare ore qui" };
  }

  const hours = Math.max(0, Math.floor(input.hours) || 0);
  const minutes = Math.max(0, Math.floor(input.minutes) || 0);
  if (hours * 60 + minutes <= 0) {
    return { success: false, message: "Inserisci una durata maggiore di zero" };
  }

  const supabase = await createClient();

  const [{ data: project }, { data: userRow }] = await Promise.all([
    supabase
      .from("manager_projects")
      .select("site_id")
      .eq("id", input.projectId)
      .maybeSingle(),
    supabase
      .from("User")
      .select("id")
      .eq("authId", userContext.user.id)
      .maybeSingle(),
  ]);

  if (!project) {
    return { success: false, message: "Progetto non trovato" };
  }
  if (!userRow) {
    return { success: false, message: "Profilo utente non trovato" };
  }

  const { error } = await supabase.from("Timetracking").insert({
    employee_id: userRow.id,
    site_id: project.site_id,
    hours,
    minutes,
    totalTime: parseFloat((hours + minutes / 60).toFixed(2)),
    description: input.description?.trim() || null,
    activity_type: "internal",
    internal_activity: "gestione_progetto",
    use_cnc: false,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath(`/administration/projects/${input.projectId}`);
  revalidatePath("/administration/projects");
  return { success: true };
}

/** Aggiorna le note del progetto (campo additivo di manager_projects). */
export async function updateProjectNotes(
  projectId: string,
  notes: string
): Promise<{ success: boolean; message?: string }> {
  const userContext = await getUserContext();
  if (!userContext || userContext.role !== "superadmin") {
    return { success: false, message: "Solo i superadmin possono modificare le note" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("manager_projects")
    .update({ notes: notes.trim() || null })
    .eq("id", projectId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath(`/administration/projects/${projectId}`);
  revalidatePath("/administration/projects");
  return { success: true };
}
