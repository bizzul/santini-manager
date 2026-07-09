"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { getPmAccess } from "@/lib/personal-manager/queries";
import {
  isAreaSlug,
  resolveAreaPermissions,
  type AreaSlug,
  type ItemStatus,
  type PmAccess,
} from "@/lib/personal-manager/types";

function basePath(domain: string) {
  return `/sites/${domain}/personal-manager`;
}

interface PmActionContext {
  siteId: string;
  userId: string;
  access: PmAccess;
}

/**
 * Risolve il contesto (sito + utente + accesso Beta) per le azioni.
 * Lancia se l'app Beta non e' abilitata: nessuna mutazione senza gate.
 */
async function getActionContext(domain: string): Promise<PmActionContext> {
  const userContext = await getUserContext();
  if (!userContext?.userId) {
    throw new Error("Non autenticato");
  }
  const { siteId } = await requireServerSiteContext(domain);
  const access = await getPmAccess(siteId, userContext.userId);
  if (!access || !access.beta_app_enabled) {
    throw new Error("Accesso all'app Beta non attivo");
  }
  return { siteId, userId: userContext.userId, access };
}

function assertAreaPermission(
  access: PmAccess,
  area: AreaSlug,
  action: "edit" | "create",
) {
  const perms = resolveAreaPermissions(access, area);
  if (!perms[action]) {
    throw new Error(`Permesso "${action}" non concesso per l'area ${area}`);
  }
}

export async function createItem(
  domain: string,
  input: {
    area_slug: string;
    title: string;
    notes?: string | null;
    priority?: number;
    due_date?: string | null;
  },
) {
  const { siteId, userId, access } = await getActionContext(domain);
  if (!isAreaSlug(input.area_slug)) throw new Error("Area non valida");
  assertAreaPermission(access, input.area_slug, "create");

  const title = input.title?.trim();
  if (!title) throw new Error("Il titolo e' obbligatorio");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pm_items")
    .insert({
      site_id: siteId,
      user_id: userId,
      area_slug: input.area_slug,
      title,
      notes: input.notes?.trim() || null,
      priority: input.priority ?? 3,
      status: "open",
      due_date: input.due_date || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(domain)}/area/${input.area_slug}`);
  revalidatePath(`${basePath(domain)}/today`);
  revalidatePath(basePath(domain));
  return { ok: true, id: data.id as string };
}

export async function updateItem(
  domain: string,
  itemId: string,
  patch: {
    title?: string;
    notes?: string | null;
    priority?: number;
    status?: ItemStatus;
    due_date?: string | null;
  },
) {
  const { siteId, userId, access } = await getActionContext(domain);
  const supabase = await createClient();

  const { data: existing, error: readErr } = await supabase
    .from("pm_items")
    .select("area_slug")
    .eq("id", itemId)
    .eq("site_id", siteId)
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!existing) throw new Error("Item non trovato");
  assertAreaPermission(access, existing.area_slug as AreaSlug, "edit");

  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title.trim();
  if (patch.notes !== undefined) update.notes = patch.notes?.trim() || null;
  if (patch.priority !== undefined) update.priority = patch.priority;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.due_date !== undefined) update.due_date = patch.due_date || null;

  const { error } = await supabase
    .from("pm_items")
    .update(update)
    .eq("id", itemId)
    .eq("site_id", siteId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(domain)}/item/${itemId}`);
  revalidatePath(`${basePath(domain)}/area/${existing.area_slug}`);
  revalidatePath(`${basePath(domain)}/today`);
  return { ok: true };
}

export async function setItemStatus(
  domain: string,
  itemId: string,
  status: ItemStatus,
) {
  return updateItem(domain, itemId, { status });
}

export async function postponeItem(
  domain: string,
  itemId: string,
  days = 1,
) {
  const { siteId, userId, access } = await getActionContext(domain);
  const supabase = await createClient();
  const { data: existing, error: readErr } = await supabase
    .from("pm_items")
    .select("area_slug, due_date")
    .eq("id", itemId)
    .eq("site_id", siteId)
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!existing) throw new Error("Item non trovato");
  assertAreaPermission(access, existing.area_slug as AreaSlug, "edit");

  const base = existing.due_date ? new Date(existing.due_date) : new Date();
  base.setDate(base.getDate() + days);
  const newDue = base.toISOString().slice(0, 10);

  const { error } = await supabase
    .from("pm_items")
    .update({ due_date: newDue, status: "postponed" })
    .eq("id", itemId)
    .eq("site_id", siteId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(domain)}/today`);
  revalidatePath(`${basePath(domain)}/area/${existing.area_slug}`);
  return { ok: true };
}

export async function setItemPriority(
  domain: string,
  itemId: string,
  priority: number,
) {
  return updateItem(domain, itemId, { priority });
}

export async function softDeleteItem(domain: string, itemId: string) {
  const { siteId, userId, access } = await getActionContext(domain);
  const supabase = await createClient();
  const { data: existing, error: readErr } = await supabase
    .from("pm_items")
    .select("area_slug")
    .eq("id", itemId)
    .eq("site_id", siteId)
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!existing) throw new Error("Item non trovato");
  assertAreaPermission(access, existing.area_slug as AreaSlug, "edit");

  const { error } = await supabase
    .from("pm_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("site_id", siteId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(domain)}/area/${existing.area_slug}`);
  revalidatePath(`${basePath(domain)}/today`);
  return { ok: true };
}

export async function recordAreaScore(
  domain: string,
  areaSlug: string,
  score: number,
) {
  const { siteId, userId, access } = await getActionContext(domain);
  if (!isAreaSlug(areaSlug)) throw new Error("Area non valida");
  assertAreaPermission(access, areaSlug, "edit");
  const clamped = Math.max(0, Math.min(10, Math.round(score)));

  const supabase = await createClient();
  const { error } = await supabase.from("pm_area_scores").insert({
    site_id: siteId,
    user_id: userId,
    area_slug: areaSlug,
    score: clamped,
  });
  if (error) throw new Error(error.message);

  revalidatePath(basePath(domain));
  revalidatePath(`${basePath(domain)}/area/${areaSlug}`);
  revalidatePath(`${basePath(domain)}/report`);
  return { ok: true };
}

export async function toggleDataSourceSync(
  domain: string,
  sourceId: string,
  enabled: boolean,
) {
  const { siteId } = await getActionContext(domain);
  const supabase = await createClient();
  const { error } = await supabase
    .from("pm_data_sources")
    .update({ sync_enabled: enabled })
    .eq("id", sourceId)
    .eq("site_id", siteId);
  if (error) throw new Error(error.message);
  revalidatePath(`${basePath(domain)}/settings`);
  return { ok: true };
}
