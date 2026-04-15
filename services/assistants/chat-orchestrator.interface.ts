import type { AssistantsChatRequest, AssistantsChatResponse } from "@/types/assistants";

export interface OrchestrateAssistantChatInput extends AssistantsChatRequest {
  authenticatedUserId: string;
}

export interface IAssistantChatOrchestrator {
  orchestrate(input: OrchestrateAssistantChatInput): Promise<AssistantsChatResponse>;
}
