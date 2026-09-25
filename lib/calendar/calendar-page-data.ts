import type { createClient } from "@/utils/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

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
