import { cache } from "react";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import {
  isFatturazioneKanban,
  isFatturazioneSchemaMissing,
  isFatturazioneToDoColumn,
  toFatturazioneTaskId,
  type FatturazioneColumnLike,
  type FatturazioneKanbanLike,
  type FatturazioneReadinessStato,
} from "@/lib/fatturazione-readiness";
import {
  FATTURAZIONE_READINESS_SETTING_KEY,
  parseFatturazioneReadinessEnabled,
} from "@/lib/fatturazione-readiness-settings";
import type { UserRole } from "@/lib/auth-utils";
import { isAdminOrSuperadmin } from "@/lib/permissions";

export function canWriteFatturazioneReadiness(role?: UserRole | null): boolean {
  return isAdminOrSuperadmin(role || "user");
}

export const isFatturazioneReadinessEnabledForSite = cache(
  async (siteId: string | null | undefined): Promise<boolean> => {
    if (!siteId) return false;

    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("site_id", siteId)
        .eq("setting_key", FATTURAZIONE_READINESS_SETTING_KEY)
        .maybeSingle();

      return parseFatturazioneReadinessEnabled(data?.setting_value);
    } catch (error) {
      console.error(
        "[fatturazione-readiness] failed to read feature flag",
        error,
      );
      return true;
    }
  },
);

type SupabaseLike = {
  from: (table: string) => any;
};

export type FatturazioneReadinessSummary = {
  stato: FatturazioneReadinessStato;
  uguale_offerta: boolean;
  confermato_at: string | null;
};

function lookupById<T>(map: Map<unknown, T>, key: unknown): T | undefined {
  if (map.has(key)) return map.get(key);
  const asNumber = Number(key);
  if (Number.isFinite(asNumber) && map.has(asNumber)) return map.get(asNumber);
  const asString = String(key ?? "");
  if (asString && map.has(asString)) return map.get(asString);
  return undefined;
}

export async function markFatturazioneReadinessInAttesa(options: {
  supabase: SupabaseLike;
  siteId: string;
  taskId: number;
}): Promise<void> {
  const { supabase, siteId, taskId } = options;
  const patch = {
    uguale_offerta: false,
    stato: "in_attesa",
    confermato_at: null,
    confermato_by: null,
  };
  const first = await supabase
    .from("fatturazione_readiness")
    .update(patch)
    .eq("site_id", siteId)
    .eq("task_id", taskId);
  if (!first.error) return;
  if (isFatturazioneSchemaMissing(first.error)) return;

  const service = createServiceClient();
  const retry = await service
    .from("fatturazione_readiness")
    .update(patch)
    .eq("site_id", siteId)
    .eq("task_id", taskId);
  if (retry.error && !isFatturazioneSchemaMissing(retry.error)) {
    throw retry.error;
  }
}

export async function loadFatturazioneReadinessByTaskId(options: {
  supabase: SupabaseLike;
  siteId: string;
  tasks: Array<{
    id?: unknown;
    kanbanId?: unknown;
    kanbanColumnId?: unknown;
  }>;
  kanbanById: Map<any, any>;
  columnById: Map<any, any>;
}): Promise<{
  enabled: boolean;
  byTaskId: Map<number, FatturazioneReadinessSummary>;
}> {
  const { supabase, siteId, tasks, kanbanById, columnById } = options;
  const invoicingTaskIds = tasks
    .map((task) => {
      const taskId = toFatturazioneTaskId(task.id);
      if (taskId == null) return null;
      const kanban = lookupById(kanbanById, task.kanbanId);
      const column = lookupById(columnById, task.kanbanColumnId);
      return isFatturazioneKanban(kanban, column) ? taskId : null;
    })
    .filter((taskId): taskId is number => taskId != null);

  const byTaskId = new Map<number, FatturazioneReadinessSummary>();
  if (invoicingTaskIds.length === 0) {
    return { enabled: false, byTaskId };
  }
  if (!(await isFatturazioneReadinessEnabledForSite(siteId))) {
    return { enabled: false, byTaskId };
  }

  const { data, error } = await supabase
    .from("fatturazione_readiness")
    .select("task_id, stato, uguale_offerta, confermato_at")
    .eq("site_id", siteId)
    .in("task_id", invoicingTaskIds);

  if (error) {
    if (!isFatturazioneSchemaMissing(error)) {
      console.warn("[fatturazione-readiness] load by task", error);
    }
    return { enabled: true, byTaskId };
  }

  for (const row of data || []) {
    const taskId = toFatturazioneTaskId(row.task_id);
    if (taskId == null) continue;
    byTaskId.set(taskId, {
      stato: row.stato === "pronto" ? "pronto" : "in_attesa",
      uguale_offerta: Boolean(row.uguale_offerta),
      confermato_at: row.confermato_at ?? null,
    });
  }

  for (const taskId of invoicingTaskIds) {
    if (!byTaskId.has(taskId)) {
      byTaskId.set(taskId, {
        stato: "in_attesa",
        uguale_offerta: false,
        confermato_at: null,
      });
    }
  }

  return { enabled: true, byTaskId };
}

export async function ensureFatturazioneReadiness(options: {
  supabase: SupabaseLike;
  siteId: string;
  taskId: number;
  resetToAttesa?: boolean;
}): Promise<void> {
  const { supabase, siteId, taskId, resetToAttesa = false } = options;
  if (!siteId || !taskId) return;

  const { data: existing, error: existingError } = await supabase
    .from("fatturazione_readiness")
    .select("id, stato")
    .eq("site_id", siteId)
    .eq("task_id", taskId)
    .maybeSingle();

  if (existingError) {
    if (isFatturazioneSchemaMissing(existingError)) return;
    throw existingError;
  }

  if (!existing) {
    const { error: insertError } = await supabase.from("fatturazione_readiness").insert({
      site_id: siteId,
      task_id: taskId,
      stato: "in_attesa",
      uguale_offerta: false,
      confermato_at: null,
      confermato_by: null,
    });
    if (insertError && !isFatturazioneSchemaMissing(insertError)) {
      throw insertError;
    }
    return;
  }

  if (resetToAttesa && existing.stato !== "in_attesa") {
    const { error: resetError } = await supabase
      .from("fatturazione_readiness")
      .update({
        stato: "in_attesa",
        uguale_offerta: false,
        confermato_at: null,
        confermato_by: null,
      })
      .eq("id", existing.id)
      .eq("site_id", siteId);
    if (resetError && !isFatturazioneSchemaMissing(resetError)) {
      throw resetError;
    }
  }
}

export async function syncFatturazioneReadinessOnMove(options: {
  supabase: SupabaseLike;
  siteId: string | null;
  taskId: number;
  kanban?: FatturazioneKanbanLike;
  column?: FatturazioneColumnLike;
}): Promise<void> {
  const { supabase, siteId, taskId, kanban, column } = options;
  if (!siteId || !taskId) return;
  if (!(await isFatturazioneReadinessEnabledForSite(siteId))) return;
  if (!isFatturazioneKanban(kanban, column)) return;
  if (!isFatturazioneToDoColumn(column)) return;

  try {
    await ensureFatturazioneReadiness({
      supabase,
      siteId,
      taskId,
      resetToAttesa: true,
    });
  } catch (error) {
    if (isFatturazioneSchemaMissing(error)) return;
    throw error;
  }
}
