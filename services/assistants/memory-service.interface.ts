import type {
  AssistantMemoryEntry,
  AssistantMemoryReadInput,
  AssistantMemoryWriteInput,
} from "@/types/assistants";

export interface IAssistantMemoryService {
  read(input: AssistantMemoryReadInput): Promise<AssistantMemoryEntry[]>;
  write(input: AssistantMemoryWriteInput): Promise<AssistantMemoryEntry>;
  purgeExpired(siteId: string): Promise<number>;
}
