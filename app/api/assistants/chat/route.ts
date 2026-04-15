import { NextRequest, NextResponse } from "next/server";
import type { AssistantsChatRequest } from "@/types/assistants";
import { getUserContext, getUserSites } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { AssistantChatOrchestratorService } from "@/services/assistants/chat-orchestrator.service";

function isValidChatRequest(value: unknown): value is AssistantsChatRequest {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.message === "string" &&
    typeof payload.siteId === "string" &&
    typeof payload.domain === "string" &&
    typeof payload.pathname === "string"
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

    const userContext = await getUserContext();
    if (!userContext?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const siteData = await getSiteData(body.domain);
    const resolvedSiteId = siteData?.data?.id as string | undefined;
    if (!resolvedSiteId || resolvedSiteId !== body.siteId) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid site context",
        },
        { status: 400 }
      );
    }

    const accessibleSites = await getUserSites();
    const hasAccess = accessibleSites.some((site) => site.id === body.siteId);
    if (!hasAccess && userContext.role !== "superadmin") {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: site access denied",
        },
        { status: 403 }
      );
    }

    const orchestrator = new AssistantChatOrchestratorService();
    const response = await orchestrator.orchestrate({
      ...body,
      authenticatedUserId: userContext.userId,
    });

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
