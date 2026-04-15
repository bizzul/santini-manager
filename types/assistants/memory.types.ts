import type { AssistantId } from "@/types/assistants/assistant.types";

export type AssistantMemoryScope =
  | "conversation"
  | "page_session"
  | "user"
  | "team";

export type AssistantMemoryStatus = "working_note" | "verified";

export interface AssistantMemoryEntry {
  id: string;
  siteId: string;
  assistantId: AssistantId;
  scope: AssistantMemoryScope;
  status: AssistantMemoryStatus;
  content: string;
  sourceRef?: string | null;
  confidence?: number | null;
  userId?: string | null;
  moduleName?: string | null;
  pathname?: string | null;
  createdAt: string;
  expiresAt?: string | null;
}

export interface AssistantMemoryReadInput {
  siteId: string;
  assistantId: AssistantId;
  userId?: string;
  scope?: AssistantMemoryScope;
  moduleName?: string;
  pathname?: string;
  limit?: number;
}

export interface AssistantMemoryWriteInput {
  siteId: string;
  assistantId: AssistantId;
  scope: AssistantMemoryScope;
  status: AssistantMemoryStatus;
  content: string;
  sourceRef?: string;
  confidence?: number;
  userId?: string;
  moduleName?: string;
  pathname?: string;
  expiresAt?: string;
}
