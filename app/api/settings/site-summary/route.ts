import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { AVAILABLE_MODULES } from "@/lib/module-config";

type FactorySettingsValue = {
  departments?: Array<{
    machines?: Array<{ id: string }>;
  }>;
};

type HrSettingsValue = {
  hourlyRates?: Record<string, number | null>;
};

export async function GET(request: NextRequest) {
  try {
    const userContext = await getUserContext();
    if (!userContext || userContext.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const [
      siteModulesResult,
      kanbansResult,
      inventoryCategoriesResult,
      inventoryItemsResult,
      productCategoriesResult,
      productsResult,
      userSitesResult,
      siteSettingsResult,
      aiSettingsResult,
    ] = await Promise.all([
      supabase
        .from("site_modules")
        .select("module_name, is_enabled")
        .eq("site_id", siteId),
      supabase.from("Kanban").select("id").eq("site_id", siteId),
      supabase
        .from("inventory_categories")
        .select("id", { count: "exact", head: true })
        .eq("site_id", siteId),
      supabase
        .from("inventory_items")
        .select("id", { count: "exact", head: true })
        .eq("site_id", siteId),
      supabase
        .from("sellproduct_categories")
        .select("id", { count: "exact", head: true })
        .eq("site_id", siteId),
      supabase
        .from("SellProduct")
        .select("id", { count: "exact", head: true })
        .eq("site_id", siteId),
      supabase.from("user_sites").select("user_id").eq("site_id", siteId),
      supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .eq("site_id", siteId)
        .in("setting_key", ["factory_settings", "hr_settings"]),
      supabase
        .from("site_ai_settings")
        .select("ai_provider, ai_model, speech_provider, ai_api_key")
        .eq("site_id", siteId)
        .single(),
    ]);

    const enabledModules = new Map(
      siteModulesResult.data?.map((module) => [
        module.module_name,
        module.is_enabled,
      ]) || []
    );
    const activeModules = AVAILABLE_MODULES.filter(
      (module) => enabledModules.get(module.name) ?? module.enabledByDefault
    ).length;

    const kanbanIds = kanbansResult.data?.map((kanban) => kanban.id) || [];
    const kanbanColumnsResult =
      kanbanIds.length > 0
        ? await supabase
            .from("KanbanColumn")
            .select("id", { count: "exact", head: true })
            .in("kanbanId", kanbanIds)
        : { count: 0 };

    const userIds = userSitesResult.data?.map((row) => row.user_id) || [];
    const rolesResult =
      userIds.length > 0
        ? await supabase
            .from("User")
            .select("authId, role")
            .in("authId", userIds)
        : { data: [] as Array<{ authId: string; role: string }> };

    const roleCounts = (rolesResult.data || []).reduce<Record<string, number>>(
      (acc, user) => {
        const role = user.role || "user";
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      },
      {}
    );

    const factorySettings =
      siteSettingsResult.data?.find(
        (entry) => entry.setting_key === "factory_settings"
      )?.setting_value || {};
    const factoryDepartments = Array.isArray(
      (factorySettings as FactorySettingsValue).departments
    )
      ? (factorySettings as FactorySettingsValue).departments || []
      : [];
    const machineCount = factoryDepartments.reduce(
      (count, department) => count + (department.machines?.length || 0),
      0
    );

    const hrSettings =
      siteSettingsResult.data?.find((entry) => entry.setting_key === "hr_settings")
        ?.setting_value || {};
    const hourlyRates = (hrSettings as HrSettingsValue).hourlyRates || {};
    const configuredRates = Object.values(hourlyRates).filter(
      (value) => value !== null && value !== undefined
    ).length;

    return NextResponse.json({
      modules: {
        active: activeModules,
        total: AVAILABLE_MODULES.length,
      },
      kanban: {
        boards: kanbanIds.length,
        columns: kanbanColumnsResult.count || 0,
      },
      inventory: {
        categories: inventoryCategoriesResult.count || 0,
        items: inventoryItemsResult.count || 0,
      },
      products: {
        categories: productCategoriesResult.count || 0,
        items: productsResult.count || 0,
      },
      users: {
        total: userIds.length,
        roleCounts,
      },
      factory: {
        departments: factoryDepartments.length,
        machines: machineCount,
      },
      hr: {
        configuredRates,
      },
      ai: {
        provider: aiSettingsResult.data?.ai_provider || null,
        model: aiSettingsResult.data?.ai_model || null,
        speechProvider: aiSettingsResult.data?.speech_provider || null,
        hasApiKey: Boolean(aiSettingsResult.data?.ai_api_key),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
