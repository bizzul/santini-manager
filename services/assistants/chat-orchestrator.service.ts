import type {
  AssistantId,
  AssistantIntent,
  AssistantsChatResponse,
  KnowledgeScope,
} from "@/types/assistants";
import { AssistantContextBuilderService } from "@/services/assistants/context-builder.service";
import { AssistantRouterService } from "@/services/assistants/assistant-router.service";
import { AssistantKnowledgeService } from "@/services/assistants/knowledge.service";
import { AssistantMemoryService } from "@/services/assistants/memory.service";
import { AssistantPromptBuilderService } from "@/services/assistants/prompt-builder.service";
import type {
  IAssistantChatOrchestrator,
  OrchestrateAssistantChatInput,
} from "@/services/assistants/chat-orchestrator.interface";

function inferIntent(message: string): AssistantIntent {
  const normalized = message.toLowerCase();
  if (!normalized.trim()) return "unknown";
  if (/(aiuto|help|non trovo|dove)/.test(normalized)) return "help";
  if (/(navig|modulo|spieg)/.test(normalized)) return "explain_module";
  if (/(riepilog|riass|summary)/.test(normalized)) return "summarize";
  if (/(priorit|urgen|avanzament|produzion|logistic|cantiere)/.test(normalized)) {
    return "operational_priority";
  }
  if (/(collo di bottiglia|bottleneck|blocco)/.test(normalized)) return "bottleneck_check";
  if (/(pianific|schedul|assegn)/.test(normalized)) return "schedule_task";
  if (/(stock|giacenz|magazzino|material)/.test(normalized)) return "stock_status";
  if (/(pipeline|lead|trattativ|opportunit)/.test(normalized)) return "pipeline_summary";
  if (/(follow[- ]?up|richiam|contatt)/.test(normalized)) return "followup_suggest";
  if (/(email|bozza|messaggio|comunicazione)/.test(normalized)) return "draft_email";
  if (/(vai a|apri|portami)/.test(normalized)) return "navigate";
  return "unknown";
}

function resolveKnowledgeScope(assistantId: AssistantId): KnowledgeScope {
  if (assistantId === "mira") return "mira";
  if (assistantId === "aura") return "aura";
  return "vera";
}

function isModuleAllowed(allowedModules: string[] | "all", moduleName: string): boolean {
  if (allowedModules === "all") return true;
  if (moduleName === "general") return true;
  return allowedModules.includes(moduleName);
}

function getAssistantLabel(assistantId: AssistantId): string {
  if (assistantId === "mira") return "Mira";
  if (assistantId === "aura") return "Aura";
  return "Vera";
}

function scopeForMemory(assistantId: AssistantId): "vera" | "mira" | "aura" {
  return assistantId === "vera" ? "vera" : assistantId;
}

export class AssistantChatOrchestratorService implements IAssistantChatOrchestrator {
  constructor(
    private readonly contextBuilder = new AssistantContextBuilderService(),
    private readonly routerService = new AssistantRouterService(),
    private readonly knowledgeService = new AssistantKnowledgeService(),
    private readonly memoryService = new AssistantMemoryService(),
    private readonly promptBuilder = new AssistantPromptBuilderService()
  ) {}

  async orchestrate(input: OrchestrateAssistantChatInput): Promise<AssistantsChatResponse> {
    const effectiveMessage = input.audioAttachment?.transcript?.trim()
      ? input.audioAttachment.transcript
      : input.message;
    const inferredIntent = inferIntent(effectiveMessage);

    const context = await this.contextBuilder.buildContext({
      siteId: input.siteId,
      domain: input.domain,
      userId: input.authenticatedUserId,
      pathname: input.pathname,
      message: effectiveMessage,
      moduleName: input.moduleName,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      currentKanbanId: input.currentKanbanId ?? null,
    });

    const routing = await this.routerService.route({
      context,
      requestedAssistant: input.requestedAssistant ?? null,
      inferredIntent,
    });

    const canAccessModule = isModuleAllowed(
      context.permissions.allowedModules,
      context.module.moduleName
    );

    const knowledgeScope = resolveKnowledgeScope(routing.selectedAssistant);
    const [roleKnowledge, commonKnowledge, recentMemory] = await Promise.all([
      this.knowledgeService.search({
        scope: knowledgeScope,
        query: effectiveMessage,
        limit: 3,
      }),
      this.knowledgeService.search({
        scope: "common",
        query: effectiveMessage,
        limit: 2,
      }),
      this.memoryService.read({
        siteId: input.siteId,
        assistantId: routing.selectedAssistant,
        userId: input.authenticatedUserId,
        scope: "conversation",
        pathname: input.pathname,
        limit: 4,
      }),
    ]);
    const mergedKnowledge = [...roleKnowledge, ...commonKnowledge];

    await this.memoryService.write({
      siteId: input.siteId,
      assistantId: routing.selectedAssistant,
      scope: "conversation",
      status: "working_note",
      content: `Utente: ${effectiveMessage}`,
      userId: input.authenticatedUserId,
      moduleName: context.module.moduleName,
      pathname: input.pathname,
    });

    const prompt = this.promptBuilder.build({
      assistantId: routing.selectedAssistant,
      inferredIntent,
      context,
      userMessage: effectiveMessage,
      memory: recentMemory,
      knowledge: mergedKnowledge,
    });

    const assistantLabel = getAssistantLabel(routing.selectedAssistant);
    const moduleDescriptor = context.module.moduleName || "general";
    const deniedMessage =
      `Posso aiutarti, ma non ho accesso al modulo \`${moduleDescriptor}\` con i permessi correnti. ` +
      "Posso comunque fornirti guida generale o passarti a Vera per supporto trasversale.";

    const answer = canAccessModule
      ? `${assistantLabel} attiva su modulo \`${moduleDescriptor}\`. Ho usato routing, contesto, memoria breve e knowledge registrata. ` +
        `Intent rilevato: \`${inferredIntent}\`.`
      : deniedMessage;

    const suggestedActions = canAccessModule
      ? [
          `preview_action:${scopeForMemory(routing.selectedAssistant)}:${moduleDescriptor}`,
          "confirm_if_ok_then_execute",
          routing.selectedAssistant === "vera"
            ? "handoff_to_specialist_if_needed"
            : "handoff_to_vera_for_cross_module",
        ]
      : ["request_permission_or_switch_module", "handoff_to_vera"];

    const response: AssistantsChatResponse = {
      success: true,
      assistant: routing.selectedAssistant,
      fallbackAssistant: routing.fallbackAssistant,
      confidence: routing.confidence,
      confidenceReason: routing.confidenceReason,
      explicitHandoff: routing.explicitHandoff,
      backstageConsultationWith: routing.backstageConsultationWith ?? null,
      inferredIntent,
      response: {
        summary: `${assistantLabel} pronta (${routing.confidenceReason}, conf ${Math.round(
          routing.confidence * 100
        )}%).`,
        answer,
        suggestedActions,
        sourceRefs: mergedKnowledge.map((item) => item.sourceId),
      },
      context: {
        site: context.site,
        module: context.module,
      },
    };

    // Keep current deterministic output and expose prompt metadata for audit-like traceability.
    await this.memoryService.write({
      siteId: input.siteId,
      assistantId: routing.selectedAssistant,
      scope: "page_session",
      status: "working_note",
      content: `Prompt system: ${prompt.systemPrompt.slice(0, 500)}`,
      userId: input.authenticatedUserId,
      moduleName: context.module.moduleName,
      pathname: input.pathname,
    });

    return response;
  }
}
