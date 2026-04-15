"use client";

export type UiAssistantId = "vera" | "mira" | "aura";

export interface UiAssistantMeta {
  id: UiAssistantId;
  displayName: string;
  roleLabel: string;
  avatarLauncherUrl: string;
  avatarChatUrl: string;
}

export function getAssistantForPath(pathname?: string | null): UiAssistantId {
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

export function getAssistantMeta(assistantId: UiAssistantId): UiAssistantMeta {
  if (assistantId === "mira") {
    return {
      id: "mira",
      displayName: "Mira",
      roleLabel: "Assistente tecnico-operativa",
      avatarLauncherUrl: "/api/assistant/avatar?assistant=mira&variant=launcher",
      avatarChatUrl: "/api/assistant/avatar?assistant=mira&variant=chat",
    };
  }

  if (assistantId === "aura") {
    return {
      id: "aura",
      displayName: "Aura",
      roleLabel: "Assistente relazionale/commerciale",
      avatarLauncherUrl: "/api/assistant/avatar?assistant=aura&variant=launcher",
      avatarChatUrl: "/api/assistant/avatar?assistant=aura&variant=chat",
    };
  }

  return {
    id: "vera",
    displayName: "Vera",
    roleLabel: "Assistente generale",
    avatarLauncherUrl: "/api/assistant/avatar?assistant=vera&variant=launcher",
    avatarChatUrl: "/api/assistant/avatar?assistant=vera&variant=chat",
  };
}
