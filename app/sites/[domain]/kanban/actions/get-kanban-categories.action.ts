"use server";

import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { getUserContext } from "@/lib/auth-utils";
import { isAdminOrSuperadmin } from "@/lib/permissions";

export interface KanbanCategory {
  id: number;
  name: string;
  identifier: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  display_order: number;
  site_id?: string | null;
  created_at?: string;
  updated_at?: string;
  is_internal?: boolean;
  internal_base_code?: number | null;
}

export async function getKanbanCategories(
  domain?: string
): Promise<KanbanCategory[]> {
  try {
    const supabase = await createClient();
    let siteId = null;

    // Get site information
    if (domain) {
      try {
        const siteResult = await getSiteData(domain);
        if (siteResult?.data) {
          siteId = siteResult.data.id;
        }
      } catch (error) {
        console.error("Error fetching site data:", error);
      }
    }

    // Get user context for permission filtering
    const userContext = await getUserContext();
    const isAdmin = userContext && isAdminOrSuperadmin(userContext.role);

    let query = supabase
      .from("KanbanCategory")
      .select("*")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (siteId) {
      query = query.eq("site_id", siteId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching kanban categories:", error);
      throw new Error("Failed to fetch kanban categories");
    }

    // If admin/superadmin, return all categories
    if (isAdmin || !userContext?.userId) {
      return data || [];
    }

    // For regular users, filter based on permissions
    // A user can see a category if they have:
    // 1. Direct category permission, OR
    // 2. Permission to at least one kanban in that category

    // Get user's category permissions
    const { data: categoryPerms } = await supabase
      .from("user_kanban_category_permissions")
      .select("kanban_category_id")
      .eq("user_id", userContext.userId);

    const allowedCategoryIds = new Set(
      categoryPerms?.map((p) => p.kanban_category_id) || []
    );

    // Get user's kanban permissions and find which categories they belong to
    const { data: kanbanPerms } = await supabase
      .from("user_kanban_permissions")
      .select("kanban_id")
      .eq("user_id", userContext.userId);

    if (kanbanPerms && kanbanPerms.length > 0) {
      const kanbanIds = kanbanPerms.map((p) => p.kanban_id);
      const { data: kanbans } = await supabase
        .from("Kanban")
        .select("category_id")
        .in("id", kanbanIds)
        .not("category_id", "is", null);

      // Add categories that have kanbans the user has access to
      kanbans?.forEach((k) => {
        if (k.category_id) {
          allowedCategoryIds.add(k.category_id);
        }
      });
    }

    // Filter categories
    const filteredCategories = (data || []).filter((category) =>
      allowedCategoryIds.has(category.id)
    );

    return filteredCategories;
  } catch (error) {
    console.error("Error fetching kanban categories:", error);
    throw new Error("Failed to fetch kanban categories");
  }
}

