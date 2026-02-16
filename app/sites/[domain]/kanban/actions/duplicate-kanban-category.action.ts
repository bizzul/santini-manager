"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";

function getBaseIdentifier(identifier: string): string {
  return identifier.replace(/-copia(-\d+)?$/, "");
}

export async function duplicateKanbanCategory(categoryId: number, domain?: string) {
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

    const { data: category, error: catError } = await supabase
      .from("KanbanCategory")
      .select("*")
      .eq("id", categoryId)
      .eq("site_id", siteId)
      .single();

    if (catError || !category) {
      return { success: false, error: "Categoria non trovata" };
    }

    const baseId = getBaseIdentifier(category.identifier);
    let newIdentifier = `${baseId}-copia`;
    let attempts = 0;
    while (attempts < 20) {
      const { data: existing } = await supabase
        .from("KanbanCategory")
        .select("id")
        .eq("site_id", siteId)
        .eq("identifier", newIdentifier)
        .single();
      if (!existing) break;
      attempts++;
      newIdentifier = `${baseId}-copia-${attempts}`;
    }

    const newName = `${category.name} (copia)`;

    const { data: newCategory, error: createCatError } = await supabase
      .from("KanbanCategory")
      .insert({
        name: newName,
        identifier: newIdentifier,
        description: category.description,
        icon: category.icon,
        color: category.color,
        display_order: category.display_order ?? 0,
        site_id: siteId,
        is_internal: category.is_internal ?? false,
        internal_base_code: category.is_internal ? category.internal_base_code : null,
      })
      .select()
      .single();

    if (createCatError || !newCategory) {
      return {
        success: false,
        error: "Errore creazione categoria: " + (createCatError?.message || "Errore sconosciuto"),
      };
    }

    const { data: kanbans, error: kanbansError } = await supabase
      .from("Kanban")
      .select("*, columns:KanbanColumn(*)")
      .eq("category_id", categoryId)
      .eq("site_id", siteId);

    if (kanbansError) {
      revalidatePath("/kanban");
      revalidateTag("kanbans");
      return {
        success: true,
        message: `Categoria duplicata: "${newCategory.name}" (0 kanban)`,
        categoryId: newCategory.id,
      };
    }

    const usedIdentifiers = new Set<string>();
    for (const kanban of kanbans || []) {
      const cols = (kanban.columns || []).sort(
        (a: any, b: any) => (a.position || 0) - (b.position || 0)
      );

      const baseKanbanId = getBaseIdentifier(kanban.identifier || `kanban-${kanban.id}`);
      let kanbanIdentifier = `${baseKanbanId}-copia`;
      let kAttempts = 0;
      while (kAttempts < 20) {
        if (!usedIdentifiers.has(kanbanIdentifier)) {
          const { data: ex } = await supabase
            .from("Kanban")
            .select("id")
            .eq("site_id", siteId)
            .eq("identifier", kanbanIdentifier)
            .single();
          if (!ex) break;
        }
        kAttempts++;
        kanbanIdentifier = `${baseKanbanId}-copia-${kAttempts}`;
      }
      usedIdentifiers.add(kanbanIdentifier);

      const newTitle = `${kanban.title || kanban.name || "Kanban"} (copia)`;

      const { data: newKanban, error: kbError } = await supabase
        .from("Kanban")
        .insert({
          title: newTitle,
          identifier: kanbanIdentifier,
          color: kanban.color,
          icon: kanban.icon,
          category_id: newCategory.id,
          site_id: siteId,
          is_offer_kanban: kanban.is_offer_kanban || false,
          target_work_kanban_id: null,
          code_change_column_id: null,
          is_work_kanban: kanban.is_work_kanban || false,
          is_production_kanban: kanban.is_production_kanban || false,
          target_invoice_kanban_id: kanban.target_invoice_kanban_id || null,
          show_category_colors: kanban.show_category_colors || false,
        })
        .select()
        .single();

      if (kbError || !newKanban) continue;

      for (let i = 0; i < cols.length; i++) {
        const col = cols[i];
        const colIdentifier = `${col.identifier?.replace(/_copia.*$/, "") || `col-${i}`}_${kanbanIdentifier}`;
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
    }

    revalidatePath("/kanban");
    revalidatePath("/");
    revalidateTag("kanbans");
    revalidateTag("kanban-categories");

    const count = kanbans?.length || 0;
    return {
      success: true,
      message: `Categoria duplicata: "${newCategory.name}" con ${count} kanban`,
      categoryId: newCategory.id,
    };
  } catch (error) {
    console.error("Error duplicating kanban category:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Errore durante la duplicazione",
    };
  }
}
