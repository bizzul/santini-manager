"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";

function getBaseIdentifier(identifier: string): string {
  return identifier.replace(/-copia(-\d+)?$/, "");
}

export async function duplicateKanban(kanbanId: number, domain?: string) {
  try {
    const supabase = await createClient();
    let siteId: string | null = null;

    if (domain) {
      const siteResult = await getSiteData(domain);
      if (siteResult?.data) {
        siteId = siteResult.data.id;
      }
    }

    if (!siteId) {
      return { success: false, error: "Site ID non trovato" };
    }

    const { data: kanban, error: fetchError } = await supabase
      .from("Kanban")
      .select("*, columns:KanbanColumn(*)")
      .eq("id", kanbanId)
      .eq("site_id", siteId)
      .single();

    if (fetchError || !kanban) {
      return { success: false, error: "Kanban non trovato" };
    }

    const columns = (kanban.columns || []).sort(
      (a: any, b: any) => (a.position || 0) - (b.position || 0)
    );

    const baseId = getBaseIdentifier(kanban.identifier || `kanban-${kanbanId}`);
    let newIdentifier = `${baseId}-copia`;
    let attempts = 0;
    while (attempts < 20) {
      const { data: existing } = await supabase
        .from("Kanban")
        .select("id")
        .eq("site_id", siteId)
        .eq("identifier", newIdentifier)
        .single();
      if (!existing) break;
      attempts++;
      newIdentifier = `${baseId}-copia-${attempts}`;
    }

    const newTitle = `${kanban.title || kanban.name || "Kanban"} (copia)`;

    const { data: newKanban, error: createError } = await supabase
      .from("Kanban")
      .insert({
        title: newTitle,
        identifier: newIdentifier,
        color: kanban.color,
        icon: kanban.icon,
        category_id: kanban.category_id,
        site_id: siteId,
        is_offer_kanban: kanban.is_offer_kanban || false,
        target_work_kanban_id: kanban.target_work_kanban_id || null,
        code_change_column_id: null,
        is_work_kanban: kanban.is_work_kanban || false,
        is_production_kanban: kanban.is_production_kanban || false,
        target_invoice_kanban_id: kanban.target_invoice_kanban_id || null,
        show_category_colors: kanban.show_category_colors || false,
      })
      .select()
      .single();

    if (createError || !newKanban) {
      return {
        success: false,
        error: "Errore creazione kanban: " + (createError?.message || "Errore sconosciuto"),
      };
    }

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const colIdentifier = `${col.identifier?.replace(/_copia.*$/, "") || `col-${i}`}_${newIdentifier}`;
      await supabase.from("KanbanColumn").insert({
        title: col.title,
        identifier: colIdentifier,
        position: i + 1,
        icon: col.icon || "Check",
        column_type: col.column_type || "normal",
        is_creation_column: col.is_creation_column || false,
        kanbanId: newKanban.id,
      });
    }

    revalidatePath("/kanban");
    revalidatePath("/");
    revalidateTag("kanbans");

    return {
      success: true,
      message: `Kanban duplicato: "${newKanban.title}"`,
      kanbanId: newKanban.id,
      identifier: newKanban.identifier,
    };
  } catch (error) {
    console.error("Error duplicating kanban:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Errore durante la duplicazione",
    };
  }
}
