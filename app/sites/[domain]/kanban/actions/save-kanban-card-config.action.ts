"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import {
  DEFAULT_CARD_FIELD_CONFIG,
  type CardFieldConfig,
  type CardDisplayField,
  type CardDisplayMode,
} from "@/components/kanbans/card-display-config";

type SaveKanbanCardConfigResult = {
  success: boolean;
  error?: string;
};

const CARD_DISPLAY_MODES: CardDisplayMode[] = ["normal", "small"];
const CARD_DISPLAY_FIELDS = Object.keys(
  DEFAULT_CARD_FIELD_CONFIG.normal
) as CardDisplayField[];

function normalizeCardFieldConfig(rawConfig: unknown): CardFieldConfig {
  const config = (rawConfig ?? {}) as Partial<
    Record<CardDisplayMode, Partial<Record<CardDisplayField, unknown>>>
  >;

  const normalized = {} as CardFieldConfig;

  CARD_DISPLAY_MODES.forEach((mode) => {
    normalized[mode] = {} as Record<CardDisplayField, boolean>;
    CARD_DISPLAY_FIELDS.forEach((field) => {
      const fallback = DEFAULT_CARD_FIELD_CONFIG[mode][field];
      const value = config?.[mode]?.[field];
      normalized[mode][field] = typeof value === "boolean" ? value : fallback;
    });
  });

  return normalized;
}

export async function saveKanbanCardConfig(
  kanbanId: number,
  cardFieldConfig: CardFieldConfig,
  domain?: string
): Promise<SaveKanbanCardConfigResult> {
  try {
    const supabase = await createClient();
    let siteId: string | null = null;

    if (domain) {
      const siteResult = await getSiteData(domain);
      if (siteResult?.data) {
        siteId = siteResult.data.id;
      }
    }

    let updateQuery = supabase
      .from("Kanban")
      .update({
        card_field_config: normalizeCardFieldConfig(cardFieldConfig),
      })
      .eq("id", kanbanId);

    if (siteId) {
      updateQuery = updateQuery.eq("site_id", siteId);
    }

    const { error } = await updateQuery;

    if (error) {
      return { success: false, error: error.message };
    }

    if (domain) {
      revalidatePath(`/sites/${domain}/kanban`);
    }
    revalidatePath("/kanban");
    revalidateTag("kanbans");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Errore salvataggio configurazione card",
    };
  }
}
