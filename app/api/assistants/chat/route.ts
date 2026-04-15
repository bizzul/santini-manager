import { NextRequest, NextResponse } from "next/server";
import type {
  AssistantsChatRequest,
  AssistantsChatResponse,
} from "@/types/assistants";
import { AssistantContextBuilderService } from "@/services/assistants/context-builder.service";
import { AssistantRouterService } from "@/services/assistants/assistant-router.service";

function isValidChatRequest(value: unknown): value is AssistantsChatRequest {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.message === "string" &&
    typeof payload.siteId === "string" &&
    typeof payload.domain === "string" &&
    typeof payload.pathname === "string" &&
    typeof payload.userId === "string"
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;

    if (!isValidChatRequest(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload",
        },
        { status: 400 }
      );
    }

    const contextBuilder = new AssistantContextBuilderService();
    const routerService = new AssistantRouterService();

    const context = await contextBuilder.buildContext({
      siteId: body.siteId,
      domain: body.domain,
      userId: body.userId,
      pathname: body.pathname,
      message: body.message,
      moduleName: body.moduleName,
      entityType: body.entityType ?? null,
      entityId: body.entityId ?? null,
      currentKanbanId: body.currentKanbanId ?? null,
    });

    const routing = await routerService.route({
      context,
      requestedAssistant: body.requestedAssistant ?? null,
      inferredIntent: null,
    });

    // Stub v1: placeholder response. Business logic arrivera' in step successivo.
    const response: AssistantsChatResponse = {
      success: true,
      assistant: routing.selectedAssistant,
      fallbackAssistant: routing.fallbackAssistant,
      confidence: routing.confidence,
      confidenceReason: routing.confidenceReason,
      explicitHandoff: routing.explicitHandoff,
      backstageConsultationWith: routing.backstageConsultationWith ?? null,
      inferredIntent: "unknown",
      response: {
        summary: "Assistants Foundation attiva.",
        answer:
          "Endpoint /api/assistants/chat operativo in modalita stub. Prossimo step: orchestrazione reale con prompt, retrieval e action layer.",
        suggestedActions: [],
        sourceRefs: [],
      },
      context: {
        site: context.site,
        module: context.module,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while handling assistants chat",
      },
      { status: 500 }
    );
  }
}
