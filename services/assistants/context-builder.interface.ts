import type {
  AssistantRequestContext,
  BuildAssistantContextInput,
} from "@/types/assistants";

export interface IAssistantContextBuilder {
  buildContext(input: BuildAssistantContextInput): Promise<AssistantRequestContext>;
  resolveModuleName(pathname: string, fallback?: string): string;
  sanitizeContext(context: AssistantRequestContext): AssistantRequestContext;
}
