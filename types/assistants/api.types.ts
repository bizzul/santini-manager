import type {
  AssistantId,
  AssistantIntent,
} from "@/types/assistants/assistant.types";
import type { AssistantRequestContext } from "@/types/assistants/context.types";
import type {
  AssistantRoutingDecision,
  RouteAssistantInput,
} from "@/types/assistants/routing.types";

export interface AssistantsChatRequest {
  message: string;
  siteId: string;
  domain: string;
  pathname: string;
  userId: string;
  moduleName?: string;
  entityType?: string | null;
  entityId?: string | number | null;
  currentKanbanId?: number | null;
  requestedAssistant?: AssistantId | null;
}

export interface AssistantsChatResponse {
  success: boolean;
  assistant: AssistantId;
  fallbackAssistant: AssistantId;
  confidence: number;
  confidenceReason: string;
  explicitHandoff: boolean;
  backstageConsultationWith?: AssistantId | null;
  inferredIntent?: AssistantIntent;
  response: {
    summary: string;
    answer: string;
    suggestedActions: string[];
    sourceRefs: string[];
  };
  context: Pick<AssistantRequestContext, "site" | "module">;
}

export interface AssistantsRouteRequest {
  siteId: string;
  domain: string;
  pathname: string;
  userId: string;
  moduleName?: string;
  message?: string;
  inferredIntent?: AssistantIntent | null;
  requestedAssistant?: AssistantId | null;
}

export interface AssistantsRouteResponse {
  success: boolean;
  routing: AssistantRoutingDecision;
  context: Pick<AssistantRequestContext, "site" | "module" | "permissions">;
}

export interface AssistantsRouteServiceRequest extends RouteAssistantInput {}
