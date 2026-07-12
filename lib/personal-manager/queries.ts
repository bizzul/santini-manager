import { createClient } from "@/utils/supabase/server";
import type {
  AreaSlug,
  AreaVita,
  PmAutomation,
  PmDataSource,
  PmItem,
  PmItemSnapshot,
} from "@/lib/personal-manager/types";

/**
 * Layer dati server-side per il Manager Personale (capability per-utente).
 * Tutte le query passano da createClient() (RLS attiva): l'isolamento e'
 * garantito dalle policy user-scoped (`user_id = auth.uid()` /
 * `utente_id = auth.uid()`), ma filtriamo comunque su user_id per
 * correttezza esplicita e uso degli indici.
 */

/** Aree di vita attive dell'utente (Wheel of Life), ordinate. */
export async function getAreeVita(userId: string): Promise<AreaVita[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("aree_vita")
    .select("*")
    .eq("utente_id", userId)
    .is("deleted_at", null)
    .order("ordine", { ascending: true });
  if (error) {
    console.error("[personal-manager] getAreeVita error:", error);
    return [];
  }
  return (data as AreaVita[]) ?? [];
}

/** Punteggio corrente per area. Ritorna una mappa area -> score. */
export async function getLatestScores(
  userId: string,
): Promise<Partial<Record<AreaSlug, number>>> {
  const aree = await getAreeVita(userId);
  const map: Partial<Record<AreaSlug, number>> = {};
  for (const area of aree) {
    if (typeof area.punteggio === "number") {
      map[area.slug] = area.punteggio;
    }
  }
  return map;
}

interface GetItemsOptions {
  area?: AreaSlug;
  areas?: AreaSlug[];
  includeDone?: boolean;
}

export async function getItems(
  userId: string,
  opts: GetItemsOptions = {},
): Promise<PmItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("pm_items")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (opts.area) query = query.eq("area_slug", opts.area);
  if (opts.areas && opts.areas.length > 0) query = query.in("area_slug", opts.areas);
  if (!opts.includeDone) query = query.neq("status", "done");

  query = query
    .order("priority", { ascending: false })
    .order("due_date", { ascending: true, nullsFirst: false });

  const { data, error } = await query;
  if (error) {
    console.error("[personal-manager] getItems error:", error);
    return [];
  }
  return (data as PmItem[]) ?? [];
}

export async function getItemById(
  userId: string,
  itemId: string,
): Promise<PmItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pm_items")
    .select("*")
    .eq("user_id", userId)
    .eq("id", itemId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    console.error("[personal-manager] getItemById error:", error);
    return null;
  }
  return (data as PmItem) ?? null;
}

export async function getItemSnapshots(
  userId: string,
  itemId: string,
): Promise<PmItemSnapshot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pm_item_snapshots")
    .select("*")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .order("snapshot_at", { ascending: true });
  if (error) {
    console.error("[personal-manager] getItemSnapshots error:", error);
    return [];
  }
  return (data as PmItemSnapshot[]) ?? [];
}

/** Conteggio item aperti per area (badge sulla ruota). */
export async function getOpenItemCounts(
  userId: string,
): Promise<Partial<Record<AreaSlug, number>>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pm_items")
    .select("area_slug")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .neq("status", "done");
  if (error) {
    console.error("[personal-manager] getOpenItemCounts error:", error);
    return {};
  }
  const counts: Partial<Record<AreaSlug, number>> = {};
  for (const row of (data as Pick<PmItem, "area_slug">[]) ?? []) {
    counts[row.area_slug] = (counts[row.area_slug] ?? 0) + 1;
  }
  return counts;
}

export async function getAutomations(userId: string): Promise<PmAutomation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pm_automations")
    .select("*")
    .eq("user_id", userId)
    .order("data_prevista", { ascending: true, nullsFirst: false });
  if (error) {
    console.error("[personal-manager] getAutomations error:", error);
    return [];
  }
  return (data as PmAutomation[]) ?? [];
}

export async function getDataSources(userId: string): Promise<PmDataSource[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pm_data_sources")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  if (error) {
    console.error("[personal-manager] getDataSources error:", error);
    return [];
  }
  return (data as PmDataSource[]) ?? [];
}
