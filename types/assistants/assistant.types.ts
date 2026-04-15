export const ASSISTANT_IDS = ["vera", "mira", "aura"] as const;

export type AssistantId = (typeof ASSISTANT_IDS)[number];

export type AssistantDomain =
  | "general"
  | "operations"
  | "commercial"
  | "cross-module";

export type AssistantVisibilityMode = "off" | "manual" | "guided" | "proactive";

export interface AssistantAvatarIdentity {
  visualLabel: string;
  hairStyleHint?: string;
  sourceAssetPath?: string;
  publicAssetPath?: string;
}

export interface AssistantProfile {
  id: AssistantId;
  displayName: string;
  roleSummary: string;
  domains: AssistantDomain[];
  enabledByDefault: boolean;
  avatarIdentity?: AssistantAvatarIdentity;
}

export interface AssistantTenantFlags {
  assistantsEnabled: boolean;
  veraEnabled: boolean;
  miraEnabled: boolean;
  auraEnabled: boolean;
  visibilityMode: AssistantVisibilityMode;
}

export type AssistantIntent =
  | "navigate"
  | "explain_module"
  | "summarize"
  | "operational_priority"
  | "bottleneck_check"
  | "schedule_task"
  | "stock_status"
  | "pipeline_summary"
  | "followup_suggest"
  | "draft_email"
  | "help"
  | "unknown";
