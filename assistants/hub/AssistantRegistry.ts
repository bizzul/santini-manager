import type {
  AssistantProfile,
  AssistantTenantFlags,
} from "@/types/assistants";

export const ASSISTANT_REGISTRY: Record<
  "vera" | "mira" | "aura",
  AssistantProfile
> = {
  vera: {
    id: "vera",
    displayName: "Vera",
    roleSummary: "Assistente generale del manager",
    domains: ["general", "cross-module"],
    enabledByDefault: true,
    avatarIdentity: {
      visualLabel: "Vera (default)",
    },
  },
  mira: {
    id: "mira",
    displayName: "Mira",
    roleSummary: "Assistente organizzativa tecnico-operativa",
    domains: ["operations"],
    enabledByDefault: false,
    avatarIdentity: {
      visualLabel: "Mira (mora)",
      hairStyleHint: "mora",
      sourceAssetPath:
        "/Users/matteopaolocci/.cursor/projects/Users-matteopaolocci-santini-manager/assets/Immagine_prompt_fotorealistico_elegante-41ce4180-18b8-40ab-b7e3-ddde7cd49a4f.png",
    },
  },
  aura: {
    id: "aura",
    displayName: "Aura",
    roleSummary: "Assistente relazionale/commerciale",
    domains: ["commercial"],
    enabledByDefault: false,
    avatarIdentity: {
      visualLabel: "Aura (rossa)",
      hairStyleHint: "rossa",
      sourceAssetPath:
        "/Users/matteopaolocci/.cursor/projects/Users-matteopaolocci-santini-manager/assets/Immagine_prompt_fotorealistico_capelli_rossi-0381fad3-fd21-42c5-a6ac-fe74b0b3652e.png",
    },
  },
};

export const DEFAULT_ASSISTANT_TENANT_FLAGS: AssistantTenantFlags = {
  assistantsEnabled: true,
  veraEnabled: true,
  miraEnabled: true,
  auraEnabled: true,
  visibilityMode: "guided",
};

export function isAssistantEnabledForTenant(
  assistantId: "vera" | "mira" | "aura",
  flags: AssistantTenantFlags
): boolean {
  if (!flags.assistantsEnabled) return false;
  if (assistantId === "vera") return flags.veraEnabled;
  if (assistantId === "mira") return flags.miraEnabled;
  return flags.auraEnabled;
}
