import {
  ASSISTANT_ROUTING_RULES_V1,
  DEFAULT_FALLBACK_ASSISTANT,
  INTENT_TO_ASSISTANT_HINT_V1,
} from "@/config/assistants/assistant-routing.config";
import type {
  AssistantRoutingDecision,
  AssistantRoutingSignal,
  RouteAssistantInput,
} from "@/types/assistants";
import type { IAssistantRouterService } from "@/services/assistants/router-service.interface";

export class AssistantRouterService implements IAssistantRouterService {
  async route(input: RouteAssistantInput): Promise<AssistantRoutingDecision> {
    const signals = this.collectSignals(input);
    const confidence = this.computeConfidence(signals);
    const { pathname } = input.context.module;

    if (input.requestedAssistant) {
      return {
        selectedAssistant: input.requestedAssistant,
        fallbackAssistant: DEFAULT_FALLBACK_ASSISTANT,
        confidence: 1,
        confidenceReason: "explicit-user-selection",
        explicitHandoff: true,
        backstageConsultationWith: null,
        matchedRuleId: "user-requested-assistant",
      };
    }

    const pathnameAssistant = this.mapPathnameToAssistant(pathname);
    const intentAssistant = input.inferredIntent
      ? INTENT_TO_ASSISTANT_HINT_V1[input.inferredIntent]
      : undefined;

    const selected = intentAssistant || pathnameAssistant || DEFAULT_FALLBACK_ASSISTANT;
    const matchedRule =
      ASSISTANT_ROUTING_RULES_V1.find((rule) => rule.assistantSelected === selected) ||
      ASSISTANT_ROUTING_RULES_V1[ASSISTANT_ROUTING_RULES_V1.length - 1];

    return {
      selectedAssistant: selected,
      fallbackAssistant: matchedRule.fallbackAssistant,
      confidence,
      confidenceReason: intentAssistant
        ? "intent-hint"
        : pathnameAssistant
        ? "pathname-rule"
        : "default-fallback",
      explicitHandoff: false,
      backstageConsultationWith: null,
      matchedRuleId: matchedRule.id,
    };
  }

  collectSignals(input: RouteAssistantInput): AssistantRoutingSignal {
    const pathname = input.context.module.pathname;
    const pathnameMatch = this.mapPathnameToAssistant(pathname);
    const intentMatch = input.inferredIntent
      ? INTENT_TO_ASSISTANT_HINT_V1[input.inferredIntent]
      : undefined;

    return {
      pathnameMatch,
      intentMatch,
      moduleMatch: undefined,
    };
  }

  computeConfidence(signals: AssistantRoutingSignal): number {
    if (signals.intentMatch && signals.pathnameMatch) return 0.95;
    if (signals.intentMatch) return 0.85;
    if (signals.pathnameMatch) return 0.8;
    return 0.5;
  }

  private mapPathnameToAssistant(pathname: string): "vera" | "mira" | "aura" {
    if (!pathname) return "vera";
    if (
      pathname.includes("/factory") ||
      pathname.includes("/inventory") ||
      pathname.includes("/calendar") ||
      pathname.includes("/timetracking") ||
      pathname.includes("/qualityControl") ||
      pathname.includes("/boxing")
    ) {
      return "mira";
    }
    if (
      pathname.includes("/clients") ||
      pathname.includes("/offerte") ||
      pathname.includes("/dashboard/vendita") ||
      pathname.includes("/dashboard/forecast")
    ) {
      return "aura";
    }
    return "vera";
  }
}
