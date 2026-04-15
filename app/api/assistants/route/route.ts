import { NextRequest, NextResponse } from "next/server";
import type {
  AssistantsRouteRequest,
  AssistantsRouteResponse,
} from "@/types/assistants";
import { AssistantContextBuilderService } from "@/services/assistants/context-builder.service";
import { AssistantRouterService } from "@/services/assistants/assistant-router.service";

function isValidRouteRequest(value: unknown): value is AssistantsRouteRequest {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.siteId === "string" &&
    typeof payload.domain === "string" &&
    typeof payload.pathname === "string" &&
    typeof payload.userId === "string"
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;

    if (!isValidRouteRequest(body)) {
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
      message: body.message || "",
      moduleName: body.moduleName,
    });

    const routing = await routerService.route({
      context,
      requestedAssistant: body.requestedAssistant ?? null,
      inferredIntent: body.inferredIntent ?? null,
    });

    const response: AssistantsRouteResponse = {
      success: true,
      routing,
      context: {
        site: context.site,
        module: context.module,
        permissions: context.permissions,
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
            : "Unexpected error while routing assistant request",
      },
      { status: 500 }
    );
  }
}
