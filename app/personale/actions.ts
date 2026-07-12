"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { hasPersonalManagerCapability } from "@/lib/personal-manager/server-context";
import {
  isAreaSlug,
  type ItemStatus,
} from "@/lib/personal-manager/types";

const BASE = "/personale";

/**
 * Contesto per le mutation del Manager Personale: utente autenticato con
 * capability attiva. Le scritture passano da createClient() (RLS attiva,
 * policy `user_id = auth.uid()`): il perimetro e' la persona.
 */
async function getActionUserId(): Promise<string> {
  const userContext = await getUserContext();
  if (!userContext?.userId) {
    throw new Error("Non autenticato");
  }
  const enabled = await hasPersonalManagerCapability(userContext.userId);
  if (!enabled) {
    throw new Error("Manager Personale non abilitato");
  }
  return userContext.userId;
}

export async function createItem(input: {
  area_slug: string;
  title: string;
  notes?: string | null;
  priority?: number;
  due_date?: string | null;
}) {
  const userId = await getActionUserId();
  if (!isAreaSlug(input.area_slug)) throw new Error("Area non valida");

  const title = input.title?.trim();
  if (!title) throw new Error("Il titolo e' obbligatorio");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pm_items")
    .insert({
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

  revalidatePath(`${BASE}/area/${input.area_slug}`);
  revalidatePath(`${BASE}/today`);
  revalidatePath(BASE);
  return { ok: true, id: data.id as string };
}

export async function updateItem(
  itemId: string,
  patch: {
    title?: string;
    notes?: string | null;
    priority?: number;
    status?: ItemStatus;
    due_date?: string | null;
  },
) {
  const userId = await getActionUserId();
  const supabase = await createClient();

  const { data: existing, error: readErr } = await supabase
    .from("pm_items")
    .select("area_slug")
    .eq("id", itemId)
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!existing) throw new Error("Item non trovato");

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
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  revalidatePath(`${BASE}/item/${itemId}`);
  revalidatePath(`${BASE}/area/${existing.area_slug}`);
  revalidatePath(`${BASE}/today`);
  return { ok: true };
}

export async function setItemStatus(itemId: string, status: ItemStatus) {
  return updateItem(itemId, { status });
}

export async function postponeItem(itemId: string, days = 1) {
  const userId = await getActionUserId();
  const supabase = await createClient();
  const { data: existing, error: readErr } = await supabase
    .from("pm_items")
    .select("area_slug, due_date")
    .eq("id", itemId)
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!existing) throw new Error("Item non trovato");

  const base = existing.due_date ? new Date(existing.due_date) : new Date();
  base.setDate(base.getDate() + days);
  const newDue = base.toISOString().slice(0, 10);

  const { error } = await supabase
    .from("pm_items")
    .update({ due_date: newDue, status: "postponed" })
    .eq("id", itemId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  revalidatePath(`${BASE}/today`);
  revalidatePath(`${BASE}/area/${existing.area_slug}`);
  return { ok: true };
}

export async function setItemPriority(itemId: string, priority: number) {
  return updateItem(itemId, { priority });
}

export async function softDeleteItem(itemId: string) {
  const userId = await getActionUserId();
  const supabase = await createClient();
  const { data: existing, error: readErr } = await supabase
    .from("pm_items")
    .select("area_slug")
    .eq("id", itemId)
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!existing) throw new Error("Item non trovato");

  const { error } = await supabase
    .from("pm_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  revalidatePath(`${BASE}/area/${existing.area_slug}`);
  revalidatePath(`${BASE}/today`);
  return { ok: true };
}

/** Aggiorna il punteggio dell'area sulla riga aree_vita dell'utente. */
export async function recordAreaScore(areaSlug: string, score: number) {
  const userId = await getActionUserId();
  if (!isAreaSlug(areaSlug)) throw new Error("Area non valida");
  const clamped = Math.max(0, Math.min(10, Math.round(score)));

  const supabase = await createClient();
  const { error } = await supabase
    .from("aree_vita")
    .update({ punteggio: clamped })
    .eq("utente_id", userId)
    .eq("slug", areaSlug)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);

  revalidatePath(BASE);
  revalidatePath(`${BASE}/area/${areaSlug}`);
  revalidatePath(`${BASE}/report`);
  return { ok: true };
}

export async function toggleDataSourceSync(sourceId: string, enabled: boolean) {
  const userId = await getActionUserId();
  const supabase = await createClient();
  const { error } = await supabase
    .from("pm_data_sources")
    .update({ sync_enabled: enabled })
    .eq("id", sourceId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath(`${BASE}/settings`);
  return { ok: true };
}
