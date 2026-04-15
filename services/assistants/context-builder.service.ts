import { createClient } from "@/utils/supabase/server";
import type { UserRole } from "@/lib/auth-utils";
import { AVAILABLE_MODULES } from "@/lib/module-config";
import { getUserPermissions, isAdminOrSuperadmin } from "@/lib/permissions";
import type {
  AssistantRequestContext,
  BuildAssistantContextInput,
} from "@/types/assistants";
import type { IAssistantContextBuilder } from "@/services/assistants/context-builder.interface";

export class AssistantContextBuilderService implements IAssistantContextBuilder {
  async buildContext(
    input: BuildAssistantContextInput
  ): Promise<AssistantRequestContext> {
    const moduleName = this.resolveModuleName(input.pathname, input.moduleName);
    const supabase = await createClient();

    const [{ data: userData }, { data: siteModulesData }] = await Promise.all([
      supabase
        .from("User")
        .select("role, assistance_level")
        .eq("authId", input.userId)
        .maybeSingle(),
      supabase
        .from("site_modules")
        .select("module_name, is_enabled")
        .eq("site_id", input.siteId),
    ]);

    const role = (userData?.role as UserRole | undefined) || "user";
    const assistanceLevel = (userData?.assistance_level as string | undefined) || null;

    const moduleMap = new Map(
      (siteModulesData || []).map((row) => [row.module_name, Boolean(row.is_enabled)])
    );

    const enabledModules = AVAILABLE_MODULES.filter((module) => {
      const siteEnabled = moduleMap.has(module.name)
        ? Boolean(moduleMap.get(module.name))
        : module.enabledByDefault;
      return siteEnabled;
    }).map((module) => module.name);

    const isPrivileged = isAdminOrSuperadmin(role);
    const rawPermissions = isPrivileged
      ? null
      : await getUserPermissions(input.userId, input.siteId);

    const modulePermissions =
      !rawPermissions || rawPermissions.modules.length === 0
        ? enabledModules
        : rawPermissions.modules.filter((name) => enabledModules.includes(name));

    const allowedKanbans =
      !rawPermissions || rawPermissions.kanbans.length === 0
        ? "all"
        : rawPermissions.kanbans;
    const allowedKanbanCategories =
      !rawPermissions || rawPermissions.kanban_categories.length === 0
        ? "all"
        : rawPermissions.kanban_categories;

    const context: AssistantRequestContext = {
      user: {
        userId: input.userId,
        role,
        assistanceLevel,
      },
      site: {
        siteId: input.siteId,
        domain: input.domain,
        enabledModules,
      },
      module: {
        pathname: input.pathname,
        moduleName,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        currentKanbanId: input.currentKanbanId ?? null,
      },
      permissions: {
        allowedModules: isPrivileged ? "all" : modulePermissions,
        allowedKanbans: isPrivileged ? "all" : allowedKanbans,
        allowedKanbanCategories: isPrivileged ? "all" : allowedKanbanCategories,
      },
    };

    return this.sanitizeContext(context);
  }

  resolveModuleName(pathname: string, fallback = "general"): string {
    if (!pathname) return fallback;
    if (pathname.includes("/dashboard/vendita")) return "dashboard-vendita";
    if (pathname.includes("/dashboard/forecast")) return "dashboard-forecast";
    if (pathname.includes("/dashboard/produzione")) return "dashboard-produzione";
    if (pathname.includes("/dashboard/avor")) return "dashboard-avor";
    if (pathname.includes("/dashboard")) return "dashboard";
    if (pathname.includes("/kanban")) return "kanban";
    if (pathname.includes("/calendar-installation")) return "calendar-installation";
    if (pathname.includes("/calendar-service")) return "calendar-service";
    if (pathname.includes("/calendar")) return "calendar";
    if (pathname.includes("/timetracking")) return "timetracking";
    if (pathname.includes("/inventory")) return "inventory";
    if (pathname.includes("/factory")) return "factory";
    if (pathname.includes("/clients")) return "clients";
    if (pathname.includes("/manufacturers")) return "manufacturers";
    if (pathname.includes("/offerte")) return "offerte";
    if (pathname.includes("/suppliers")) return "suppliers";
    if (pathname.includes("/products")) return "products";
    if (pathname.includes("/reports")) return "reports";
    if (pathname.includes("/qualityControl")) return "qualitycontrol";
    if (pathname.includes("/boxing")) return "boxing";
    if (pathname.includes("/attendance")) return "attendance";
    if (pathname.includes("/collaborators")) return "collaborators";
    return fallback;
  }

  sanitizeContext(context: AssistantRequestContext): AssistantRequestContext {
    const sanitized = { ...context };
    sanitized.user = {
      ...sanitized.user,
      role: sanitized.user.role || "user",
    };
    sanitized.site = {
      ...sanitized.site,
      enabledModules: Array.isArray(sanitized.site.enabledModules)
        ? sanitized.site.enabledModules
        : [],
    };
    return sanitized;
  }
}
