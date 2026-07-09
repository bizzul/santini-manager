import { createClient } from "@/utils/supabase/server";
import type {
  AreaSlug,
  PmAccess,
  PmAreaScore,
  PmAutomation,
  PmDataSource,
  PmItem,
  PmItemSnapshot,
  PmLifeArea,
} from "@/lib/personal-manager/types";

/**
 * Layer dati server-side per il Personal Manager.
 * Tutte le query passano da createClient() (RLS attiva): l'isolamento
 * site+user e' garantito dalle policy, ma filtriamo comunque su site_id/user_id
 * per correttezza esplicita e uso degli indici.
 */

export async function getPmAccess(
  siteId: string,
  userId: string,
): Promise<PmAccess | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pm_access")
    .select("*")
    .eq("site_id", siteId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[personal-manager] getPmAccess error:", error);
    return null;
  }
  return (data as PmAccess) ?? null;
}

export async function getLifeAreas(siteId: string): Promise<PmLifeArea[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pm_life_areas")
    .select("*")
    .eq("site_id", siteId)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[personal-manager] getLifeAreas error:", error);
    return [];
  }
  return (data as PmLifeArea[]) ?? [];
}

/** Ultimo punteggio per area (0-10). Ritorna una mappa area -> score. */
export async function getLatestScores(
  siteId: string,
  userId: string,
): Promise<Partial<Record<AreaSlug, number>>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pm_area_scores")
    .select("area_slug, score, recorded_at")
    .eq("site_id", siteId)
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false });
  if (error) {
    console.error("[personal-manager] getLatestScores error:", error);
    return {};
  }
  const map: Partial<Record<AreaSlug, number>> = {};
  for (const row of (data as Pick<PmAreaScore, "area_slug" | "score">[]) ?? []) {
    if (!(row.area_slug in map)) {
      map[row.area_slug] = row.score;
    }
  }
  return map;
}

/** Storico punteggi (append-only), opzionalmente filtrato per area. */
export async function getScoreHistory(
  siteId: string,
  userId: string,
  area?: AreaSlug,
): Promise<PmAreaScore[]> {
  const supabase = await createClient();
  let query = supabase
    .from("pm_area_scores")
    .select("*")
    .eq("site_id", siteId)
    .eq("user_id", userId)
    .order("recorded_at", { ascending: true });
  if (area) query = query.eq("area_slug", area);
  const { data, error } = await query;
  if (error) {
    console.error("[personal-manager] getScoreHistory error:", error);
    return [];
  }
  return (data as PmAreaScore[]) ?? [];
}

interface GetItemsOptions {
  area?: AreaSlug;
  areas?: AreaSlug[];
  includeDone?: boolean;
}

export async function getItems(
  siteId: string,
  userId: string,
  opts: GetItemsOptions = {},
): Promise<PmItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("pm_items")
    .select("*")
    .eq("site_id", siteId)
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
  siteId: string,
  userId: string,
  itemId: string,
): Promise<PmItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pm_items")
    .select("*")
    .eq("site_id", siteId)
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
  siteId: string,
  userId: string,
  itemId: string,
): Promise<PmItemSnapshot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pm_item_snapshots")
    .select("*")
    .eq("site_id", siteId)
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
  siteId: string,
  userId: string,
): Promise<Partial<Record<AreaSlug, number>>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pm_items")
    .select("area_slug")
    .eq("site_id", siteId)
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

export async function getAutomations(siteId: string): Promise<PmAutomation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pm_automations")
    .select("*")
    .eq("site_id", siteId)
    .order("data_prevista", { ascending: true, nullsFirst: false });
  if (error) {
    console.error("[personal-manager] getAutomations error:", error);
    return [];
  }
  return (data as PmAutomation[]) ?? [];
}

export async function getDataSources(siteId: string): Promise<PmDataSource[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pm_data_sources")
    .select("*")
    .eq("site_id", siteId)
    .order("name", { ascending: true });
  if (error) {
    console.error("[personal-manager] getDataSources error:", error);
    return [];
  }
  return (data as PmDataSource[]) ?? [];
}
