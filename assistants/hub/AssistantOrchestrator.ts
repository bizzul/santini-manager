import type {
  AssistantsChatRequest,
  AssistantsChatResponse,
} from "@/types/assistants";
import { AssistantContextBuilderService } from "@/services/assistants/context-builder.service";
import { AssistantRouterService } from "@/services/assistants/assistant-router.service";

export class AssistantOrchestrator {
  constructor(
    private readonly contextBuilder = new AssistantContextBuilderService(),
    private readonly routerService = new AssistantRouterService()
  ) {}

  async handleChat(request: AssistantsChatRequest): Promise<AssistantsChatResponse> {
    const userId = request.userId ?? "";

    const context = await this.contextBuilder.buildContext({
      siteId: request.siteId,
      domain: request.domain,
      userId,
      pathname: request.pathname,
      message: request.message,
      moduleName: request.moduleName,
      entityType: request.entityType ?? null,
      entityId: request.entityId ?? null,
      currentKanbanId: request.currentKanbanId ?? null,
    });

    const routing = await this.routerService.route({
      context,
      requestedAssistant: request.requestedAssistant ?? null,
      inferredIntent: null,
    });

    // Stub v1: solo orchestration skeleton.
    return {
      success: true,
      assistant: routing.selectedAssistant,
      fallbackAssistant: routing.fallbackAssistant,
      confidence: routing.confidence,
      confidenceReason: routing.confidenceReason,
      explicitHandoff: routing.explicitHandoff,
      backstageConsultationWith: routing.backstageConsultationWith ?? null,
      inferredIntent: "unknown",
      response: {
        summary: "AssistantOrchestrator pronto.",
        answer: "Business logic non ancora implementata in questa milestone.",
        suggestedActions: [],
        sourceRefs: [],
      },
      context: {
        site: context.site,
        module: context.module,
      },
    };
  }
}
