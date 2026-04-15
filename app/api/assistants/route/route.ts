import { NextRequest, NextResponse } from "next/server";
import type {
  AssistantIntent,
  AssistantsRouteRequest,
  AssistantsRouteResponse,
} from "@/types/assistants";
import { getUserContext, getUserSites } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { AssistantContextBuilderService } from "@/services/assistants/context-builder.service";
import { AssistantRouterService } from "@/services/assistants/assistant-router.service";

function isValidRouteRequest(value: unknown): value is AssistantsRouteRequest {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.siteId === "string" &&
    typeof payload.domain === "string" &&
    typeof payload.pathname === "string"
  );
}

function inferIntent(message?: string): AssistantIntent {
  const normalized = (message || "").toLowerCase();
  if (!normalized) return "unknown";
  if (/(aiuto|help|dove|navig)/.test(normalized)) return "help";
  if (/(produzion|logistic|cantiere|operativ)/.test(normalized)) return "operational_priority";
  if (/(lead|crm|offert|email|follow)/.test(normalized)) return "pipeline_summary";
  if (/(riass|riepilog)/.test(normalized)) return "summarize";
  return "unknown";
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

    const userContext = await getUserContext();
    if (!userContext?.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const siteData = await getSiteData(body.domain);
    const resolvedSiteId = siteData?.data?.id as string | undefined;
    if (!resolvedSiteId || resolvedSiteId !== body.siteId) {
      return NextResponse.json(
        { success: false, error: "Invalid site context" },
        { status: 400 }
      );
    }

    const accessibleSites = await getUserSites();
    const hasAccess = accessibleSites.some((site) => site.id === body.siteId);
    if (!hasAccess && userContext.role !== "superadmin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: site access denied" },
        { status: 403 }
      );
    }

    const contextBuilder = new AssistantContextBuilderService();
    const routerService = new AssistantRouterService();
    const inferredIntent = body.inferredIntent ?? inferIntent(body.message);

    const context = await contextBuilder.buildContext({
      siteId: body.siteId,
      domain: body.domain,
      userId: userContext.userId,
      pathname: body.pathname,
      message: body.message || "",
      moduleName: body.moduleName,
    });

    const routing = await routerService.route({
      context,
      requestedAssistant: body.requestedAssistant ?? null,
      inferredIntent,
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
