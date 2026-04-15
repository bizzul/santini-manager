import type { AssistantIntent } from "@/types/assistants/assistant.types";

export interface AssistantUserContext {
  userId: string;
  role: string;
  assistanceLevel?: string | null;
}

export interface AssistantSiteContext {
  siteId: string;
  domain: string;
  enabledModules: string[];
}

export interface AssistantModuleContext {
  pathname: string;
  moduleName: string;
  entityType?: string | null;
  entityId?: string | number | null;
  currentKanbanId?: number | null;
}

export interface AssistantPermissionContext {
  allowedModules: string[] | "all";
  allowedKanbans: number[] | "all";
  allowedKanbanCategories: number[] | "all";
}

export interface AssistantRequestContext {
  user: AssistantUserContext;
  site: AssistantSiteContext;
  module: AssistantModuleContext;
  permissions: AssistantPermissionContext;
  inferredIntent?: AssistantIntent;
}

export interface BuildAssistantContextInput {
  siteId: string;
  domain: string;
  userId: string;
  pathname: string;
  message: string;
  moduleName?: string;
  entityType?: string | null;
  entityId?: string | number | null;
  currentKanbanId?: number | null;
}
