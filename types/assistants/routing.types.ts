import type {
  AssistantId,
  AssistantIntent,
} from "@/types/assistants/assistant.types";
import type { AssistantRequestContext } from "@/types/assistants/context.types";

export interface AssistantRoutingRule {
  id: string;
  priority: number;
  condition: string;
  assistantSelected: AssistantId;
  fallbackAssistant: AssistantId;
  allowExplicitHandoff: boolean;
  allowBackstageConsultation: boolean;
}

export interface AssistantRoutingSignal {
  pathnameMatch?: AssistantId;
  intentMatch?: AssistantId;
  moduleMatch?: AssistantId;
}

export interface AssistantRoutingDecision {
  selectedAssistant: AssistantId;
  fallbackAssistant: AssistantId;
  confidence: number;
  confidenceReason: string;
  explicitHandoff: boolean;
  backstageConsultationWith?: AssistantId | null;
  matchedRuleId?: string;
}

export interface RouteAssistantInput {
  context: AssistantRequestContext;
  requestedAssistant?: AssistantId | null;
  inferredIntent?: AssistantIntent | null;
}
