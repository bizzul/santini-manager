import type {
  AssistantMemoryEntry,
  AssistantMemoryReadInput,
  AssistantMemoryWriteInput,
} from "@/types/assistants";
import type { IAssistantMemoryService } from "@/services/assistants/memory-service.interface";
import { MEMORY_MODEL_V1 } from "@/config/assistants/memory-model.config";

const memoryStore = new Map<string, AssistantMemoryEntry[]>();

function createStoreKey(siteId: string, assistantId: string, userId?: string) {
  return `${siteId}:${assistantId}:${userId || "anonymous"}`;
}

function getScopeTtlHours(scope: AssistantMemoryWriteInput["scope"]): number | null {
  const policy = MEMORY_MODEL_V1.find((entry) => entry.scope === scope);
  return policy?.ttlHours ?? null;
}

function isExpired(entry: AssistantMemoryEntry): boolean {
  if (!entry.expiresAt) return false;
  return Date.now() > new Date(entry.expiresAt).getTime();
}

export class AssistantMemoryService implements IAssistantMemoryService {
  async read(input: AssistantMemoryReadInput): Promise<AssistantMemoryEntry[]> {
    const key = createStoreKey(input.siteId, input.assistantId, input.userId);
    const entries = memoryStore.get(key) || [];

    const scoped = entries
      .filter((entry) => !isExpired(entry))
      .filter((entry) => (input.scope ? entry.scope === input.scope : true))
      .filter((entry) => (input.moduleName ? entry.moduleName === input.moduleName : true))
      .filter((entry) => (input.pathname ? entry.pathname === input.pathname : true))
      .slice(-(input.limit || 20));

    return scoped;
  }

  async write(input: AssistantMemoryWriteInput): Promise<AssistantMemoryEntry> {
    const key = createStoreKey(input.siteId, input.assistantId, input.userId);
    const entries = memoryStore.get(key) || [];
    const ttlHours = getScopeTtlHours(input.scope);

    const now = new Date();
    const expiresAt =
      typeof ttlHours === "number"
        ? new Date(now.getTime() + ttlHours * 60 * 60 * 1000).toISOString()
        : null;

    const entry: AssistantMemoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      siteId: input.siteId,
      assistantId: input.assistantId,
      scope: input.scope,
      status: input.status,
      content: input.content,
      sourceRef: input.sourceRef ?? null,
      confidence: typeof input.confidence === "number" ? input.confidence : null,
      userId: input.userId ?? null,
      moduleName: input.moduleName ?? null,
      pathname: input.pathname ?? null,
      createdAt: now.toISOString(),
      expiresAt,
    };

    const cleaned = entries.filter((existing) => !isExpired(existing));
    const updated = [...cleaned, entry].slice(-200);
    memoryStore.set(key, updated);
    return entry;
  }

  async purgeExpired(siteId: string): Promise<number> {
    let removed = 0;
    for (const [key, entries] of Array.from(memoryStore.entries())) {
      if (!key.startsWith(`${siteId}:`)) continue;
      const filtered = entries.filter((entry) => !isExpired(entry));
      removed += entries.length - filtered.length;
      memoryStore.set(key, filtered);
    }
    return removed;
  }
}
