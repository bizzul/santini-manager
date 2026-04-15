import type { AssistantMemoryScope } from "@/types/assistants";

export interface MemoryScopePolicy {
  scope: AssistantMemoryScope;
  ttlHours: number | null;
  allowedInMvp: boolean;
  description: string;
}

export const MEMORY_MODEL_V1: MemoryScopePolicy[] = [
  {
    scope: "conversation",
    ttlHours: 24,
    allowedInMvp: true,
    description: "Memoria breve per continuita' conversazione.",
  },
  {
    scope: "page_session",
    ttlHours: 8,
    allowedInMvp: true,
    description: "Contesto pagina/modulo corrente.",
  },
  {
    scope: "user",
    ttlHours: null,
    allowedInMvp: false,
    description: "Preferenze persistenti utente (post-MVP).",
  },
  {
    scope: "team",
    ttlHours: null,
    allowedInMvp: false,
    description: "Memoria operativa team validata (post-MVP).",
  },
];
