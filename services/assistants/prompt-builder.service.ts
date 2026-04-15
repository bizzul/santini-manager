import {
  ASSISTANT_COMMON_SYSTEM_PROMPT_V1,
  ASSISTANT_ROLE_PROMPT_V1,
} from "@/config/assistants/prompt-templates.config";
import type {
  BuildAssistantPromptInput,
  BuildAssistantPromptOutput,
  IAssistantPromptBuilder,
} from "@/services/assistants/prompt-builder.interface";

export class AssistantPromptBuilderService implements IAssistantPromptBuilder {
  build(input: BuildAssistantPromptInput): BuildAssistantPromptOutput {
    const rolePrompt = ASSISTANT_ROLE_PROMPT_V1[input.assistantId];

    const memoryLines = input.memory.length
      ? input.memory
          .map((entry) => `- [${entry.scope}/${entry.status}] ${entry.content}`)
          .join("\n")
      : "- Nessuna memoria recente.";

    const knowledgeLines = input.knowledge.length
      ? input.knowledge.map((item) => `- ${item.sourceId} (score=${item.score.toFixed(2)})`).join("\n")
      : "- Nessuna fonte pertinente trovata.";

    const systemPrompt = [
      ASSISTANT_COMMON_SYSTEM_PROMPT_V1,
      rolePrompt,
      "Contesto runtime:",
      `- Site: ${input.context.site.domain} (${input.context.site.siteId})`,
      `- Modulo: ${input.context.module.moduleName}`,
      `- Path: ${input.context.module.pathname}`,
      `- Intent: ${input.inferredIntent}`,
      `- Permessi modulo: ${
        input.context.permissions.allowedModules === "all"
          ? "all"
          : input.context.permissions.allowedModules.join(", ")
      }`,
      "Memoria recente:",
      memoryLines,
      "Knowledge candidate:",
      knowledgeLines,
    ].join("\n");

    const userPrompt = `Richiesta utente: ${input.userMessage}`;
    return { systemPrompt, userPrompt };
  }
}
