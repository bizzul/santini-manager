import type { AssistantRoutingRule } from "@/types/assistants";

export const DEFAULT_FALLBACK_ASSISTANT = "vera" as const;

export const ASSISTANT_ROUTING_RULES_V1: AssistantRoutingRule[] = [
  {
    id: "home-general-vera",
    priority: 100,
    condition: "pathname startsWith /sites/[domain] root or /dashboard",
    assistantSelected: "vera",
    fallbackAssistant: "vera",
    allowExplicitHandoff: true,
    allowBackstageConsultation: true,
  },
  {
    id: "operations-mira",
    priority: 90,
    condition:
      "pathname includes /factory|/inventory|/calendar|/calendar-installation|/calendar-service|/timetracking|/qualityControl|/boxing",
    assistantSelected: "mira",
    fallbackAssistant: "vera",
    allowExplicitHandoff: true,
    allowBackstageConsultation: true,
  },
  {
    id: "commercial-aura",
    priority: 90,
    condition:
      "pathname includes /clients|/offerte|/dashboard/vendita|/dashboard/forecast",
    assistantSelected: "aura",
    fallbackAssistant: "vera",
    allowExplicitHandoff: true,
    allowBackstageConsultation: true,
  },
  {
    id: "fallback-vera",
    priority: 10,
    condition: "fallback rule",
    assistantSelected: "vera",
    fallbackAssistant: "vera",
    allowExplicitHandoff: true,
    allowBackstageConsultation: false,
  },
];

export const INTENT_TO_ASSISTANT_HINT_V1: Record<string, "vera" | "mira" | "aura"> =
  {
    navigate: "vera",
    explain_module: "vera",
    summarize: "vera",
    operational_priority: "mira",
    bottleneck_check: "mira",
    schedule_task: "mira",
    stock_status: "mira",
    pipeline_summary: "aura",
    followup_suggest: "aura",
    draft_email: "aura",
    help: "vera",
  };
