import type {
  KnowledgeQueryInput,
  KnowledgeQueryResultItem,
} from "@/types/assistants";

export interface IAssistantKnowledgeService {
  search(input: KnowledgeQueryInput): Promise<KnowledgeQueryResultItem[]>;
  getSourcesByScope(scope: "common" | "vera" | "mira" | "aura"): string[];
}
