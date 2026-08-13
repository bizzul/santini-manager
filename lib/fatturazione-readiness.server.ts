import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import {
  isFatturazioneKanban,
  isFatturazioneSchemaMissing,
  isFatturazioneToDoColumn,
  type FatturazioneColumnLike,
  type FatturazioneKanbanLike,
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
    await supabase
      .from("fatturazione_readiness")
      .update({
        stato: "in_attesa",
        uguale_offerta: false,
        confermato_at: null,
        confermato_by: null,
      })
      .eq("id", existing.id)
      .eq("site_id", siteId);
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
