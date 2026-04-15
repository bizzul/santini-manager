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
    const { pathname, moduleName } = input.context.module;

    if (input.requestedAssistant) {
      const pathAssistant = this.mapPathnameToAssistant(pathname);
      return {
        selectedAssistant: input.requestedAssistant,
        fallbackAssistant: DEFAULT_FALLBACK_ASSISTANT,
        confidence: 1,
        confidenceReason: "explicit-user-selection",
        explicitHandoff: input.requestedAssistant !== pathAssistant,
        backstageConsultationWith:
          input.requestedAssistant === "vera" && pathAssistant !== "vera"
            ? pathAssistant
            : null,
        matchedRuleId: "user-requested-assistant",
      };
    }

    const pathnameAssistant = this.mapPathnameToAssistant(pathname);
    const moduleAssistant = this.mapModuleToAssistant(moduleName);
    const intentAssistant = input.inferredIntent
      ? INTENT_TO_ASSISTANT_HINT_V1[input.inferredIntent]
      : undefined;

    const selected = intentAssistant || moduleAssistant || pathnameAssistant || DEFAULT_FALLBACK_ASSISTANT;
    const matchedRule =
      ASSISTANT_ROUTING_RULES_V1.find((rule) => rule.assistantSelected === selected) ||
      ASSISTANT_ROUTING_RULES_V1[ASSISTANT_ROUTING_RULES_V1.length - 1];

    const backstage =
      selected === "vera"
        ? intentAssistant && intentAssistant !== "vera"
          ? intentAssistant
          : moduleAssistant && moduleAssistant !== "vera"
          ? moduleAssistant
          : null
        : null;

    const explicitHandoff =
      selected !== pathnameAssistant && selected !== "vera" && confidence >= 0.7;

    return {
      selectedAssistant: selected,
      fallbackAssistant: matchedRule.fallbackAssistant,
      confidence,
      confidenceReason: intentAssistant
        ? "intent-hint"
        : moduleAssistant
        ? "module-context"
        : pathnameAssistant
        ? "pathname-rule"
        : "default-fallback",
      explicitHandoff,
      backstageConsultationWith: backstage,
      matchedRuleId: matchedRule.id,
    };
  }

  collectSignals(input: RouteAssistantInput): AssistantRoutingSignal {
    const { pathname, moduleName } = input.context.module;
    const pathnameMatch = this.mapPathnameToAssistant(pathname);
    const intentMatch = input.inferredIntent
      ? INTENT_TO_ASSISTANT_HINT_V1[input.inferredIntent]
      : undefined;
    const moduleMatch = this.mapModuleToAssistant(moduleName);

    return {
      pathnameMatch,
      intentMatch,
      moduleMatch,
    };
  }

  computeConfidence(signals: AssistantRoutingSignal): number {
    const hasIntent = Boolean(signals.intentMatch);
    const hasPath = Boolean(signals.pathnameMatch);
    const hasModule = Boolean(signals.moduleMatch);

    if (hasIntent && hasPath && hasModule) return 0.96;
    if (hasIntent && hasModule) return 0.9;
    if (hasIntent && hasPath) return 0.88;
    if (hasIntent) return 0.82;
    if (hasModule && hasPath) return 0.8;
    if (hasModule || hasPath) return 0.72;
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
      pathname.includes("/boxing") ||
      pathname.includes("/dashboard/produzione") ||
      pathname.includes("/dashboard/avor")
    ) {
      return "mira";
    }
    if (
      pathname.includes("/clients") ||
      pathname.includes("/offerte") ||
      pathname.includes("/dashboard/vendita") ||
      pathname.includes("/dashboard/forecast") ||
      pathname.includes("/suppliers") ||
      pathname.includes("/manufacturers")
    ) {
      return "aura";
    }
    return "vera";
  }

  private mapModuleToAssistant(moduleName?: string): "vera" | "mira" | "aura" {
    if (!moduleName) return "vera";
    if (
      [
        "factory",
        "inventory",
        "calendar",
        "calendar-installation",
        "calendar-service",
        "timetracking",
        "qualitycontrol",
        "boxing",
        "dashboard-produzione",
        "dashboard-avor",
      ].includes(moduleName)
    ) {
      return "mira";
    }
    if (
      [
        "clients",
        "offerte",
        "suppliers",
        "manufacturers",
        "dashboard-vendita",
        "dashboard-forecast",
      ].includes(moduleName)
    ) {
      return "aura";
    }
    return "vera";
  }
}
