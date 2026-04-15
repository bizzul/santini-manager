import type {
  AssistantRoutingDecision,
  AssistantRoutingSignal,
  RouteAssistantInput,
} from "@/types/assistants";

export interface IAssistantRouterService {
  route(input: RouteAssistantInput): Promise<AssistantRoutingDecision>;
  collectSignals(input: RouteAssistantInput): AssistantRoutingSignal;
  computeConfidence(signals: AssistantRoutingSignal): number;
}
