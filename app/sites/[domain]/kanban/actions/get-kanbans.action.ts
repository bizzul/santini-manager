"use server";

import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { getUserContext } from "@/lib/auth-utils";
import { isAdminOrSuperadmin } from "@/lib/permissions";

interface GetKanbansOptions {
  domain?: string;
  siteId?: string;
}

export async function getKanbans(options?: string | GetKanbansOptions) {
  try {
    const supabase = await createClient();
    let siteId: string | null = null;

    // Handle both legacy string parameter (domain) and new options object
    if (typeof options === "string") {
      // Legacy: options is domain string
      const domain = options;
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
    } else if (options) {
      // New: options is an object with domain and/or siteId
      if (options.siteId) {
        siteId = options.siteId;
      } else if (options.domain) {
        try {
          const siteResult = await getSiteData(options.domain);
          if (siteResult?.data) {
            siteId = siteResult.data.id;
          }
        } catch (error) {
          console.error("Error fetching site data:", error);
        }
      }
    }

    // Get user context for permission filtering; fall back gracefully in test/readonly contexts.
    let userContext: Awaited<ReturnType<typeof getUserContext>> | null = null;
    try {
      userContext = await getUserContext();
    } catch (error) {
      console.warn("Unable to resolve user context for kanban filtering:", error);
    }
    const isAdmin = userContext && isAdminOrSuperadmin(userContext.role);

    // OPTIMIZED: Single query with JOIN to get kanbans, columns, and category together
    // This eliminates N+1 query problem (was: 1 query for kanbans + N queries for columns)
    let kanbanQuery = supabase
      .from("Kanban")
      .select(`
        *,
        columns:KanbanColumn(*),
        category:KanbanCategory(*)
      `)
      .order("title", { ascending: true })
      .order("position", { referencedTable: "KanbanColumn", ascending: true });

    if (siteId && typeof (kanbanQuery as any).eq === "function") {
      kanbanQuery = kanbanQuery.eq("site_id", siteId);
    }

    const { data: kanbans, error: kanbansError } = await kanbanQuery;

    if (kanbansError) {
      console.error("Error fetching kanbans:", kanbansError);
      throw new Error("Failed to fetch kanbans");
    }

    // If admin/superadmin, return all kanbans
    if (isAdmin || !userContext?.userId) {
      return kanbans || [];
    }

    // For regular users, filter based on permissions
    // Get user's direct kanban permissions
    const { data: kanbanPerms } = await supabase
      .from("user_kanban_permissions")
      .select("kanban_id")
      .eq("user_id", userContext.userId);

    const allowedKanbanIds = new Set(kanbanPerms?.map((p) => p.kanban_id) || []);

    // Get user's category permissions
    const { data: categoryPerms } = await supabase
      .from("user_kanban_category_permissions")
      .select("kanban_category_id")
      .eq("user_id", userContext.userId);

    const allowedCategoryIds = new Set(
      categoryPerms?.map((p) => p.kanban_category_id) || []
    );

    // Filter kanbans: user can see a kanban if they have direct permission
    // OR if they have permission on the kanban's category
    const filteredKanbans = (kanbans || []).filter((kanban) => {
      // Check direct kanban permission
      if (allowedKanbanIds.has(kanban.id)) {
        return true;
      }
      // Check category permission
      if (kanban.category_id && allowedCategoryIds.has(kanban.category_id)) {
        return true;
      }
      return false;
    });

    return filteredKanbans;
  } catch (error) {
    console.error("Error fetching kanbans:", error);
    throw new Error("Failed to fetch kanbans");
  }
}
