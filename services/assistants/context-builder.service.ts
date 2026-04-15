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

    // Stub v1: context minimale per avviare il flusso end-to-end.
    return {
      user: {
        userId: input.userId,
        role: "user",
      },
      site: {
        siteId: input.siteId,
        domain: input.domain,
        enabledModules: [],
      },
      module: {
        pathname: input.pathname,
        moduleName,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        currentKanbanId: input.currentKanbanId ?? null,
      },
      permissions: {
        allowedModules: "all",
        allowedKanbans: "all",
        allowedKanbanCategories: "all",
      },
    };
  }

  resolveModuleName(pathname: string, fallback = "general"): string {
    if (!pathname) return fallback;
    if (pathname.includes("/dashboard")) return "dashboard";
    if (pathname.includes("/kanban")) return "kanban";
    if (pathname.includes("/calendar")) return "calendar";
    if (pathname.includes("/timetracking")) return "timetracking";
    if (pathname.includes("/inventory")) return "inventory";
    if (pathname.includes("/factory")) return "factory";
    if (pathname.includes("/clients")) return "clients";
    if (pathname.includes("/offerte")) return "offerte";
    if (pathname.includes("/suppliers")) return "suppliers";
    return fallback;
  }

  sanitizeContext(context: AssistantRequestContext): AssistantRequestContext {
    // Stub v1: hook per redazione campi sensibili o normalizzazioni future.
    return context;
  }
}
