import type {
  AssistantId,
  AssistantIntent,
  AssistantRequestContext,
  AssistantMemoryEntry,
  KnowledgeQueryResultItem,
} from "@/types/assistants";

export interface BuildAssistantPromptInput {
  assistantId: AssistantId;
  inferredIntent: AssistantIntent;
  context: AssistantRequestContext;
  userMessage: string;
  memory: AssistantMemoryEntry[];
  knowledge: KnowledgeQueryResultItem[];
}

export interface BuildAssistantPromptOutput {
  systemPrompt: string;
  userPrompt: string;
}

export interface IAssistantPromptBuilder {
  build(input: BuildAssistantPromptInput): BuildAssistantPromptOutput;
}
