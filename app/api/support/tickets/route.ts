import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth-utils";

type AssistanceLevel = "basic_tutorial" | "smart_support" | "advanced_support";

interface SupportTicketPayload {
  subject?: string;
  details?: string;
  technicalDetails?: string;
  requestType?: string;
  assistanceLevel?: AssistanceLevel;
  appPath?: string;
  userEmail?: string | null;
  userRole?: string;
}

export async function POST(request: Request) {
  try {
    const userContext = await getUserContext();
    if (!userContext) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as SupportTicketPayload;
    const subject = body.subject?.trim();
    const details = body.details?.trim();

    if (!subject || !details || details.length < 12) {
      return NextResponse.json(
        { error: "Subject and details are required." },
        { status: 400 }
      );
    }

    const ticketPayload = {
      source: "assistbot",
      createdAt: new Date().toISOString(),
      subject,
      details,
      technicalDetails: body.technicalDetails?.trim() || null,
      requestType: body.requestType || "support",
      assistanceLevel: body.assistanceLevel || "smart_support",
      appPath: body.appPath || null,
      user: {
        id: userContext.userId || userContext.user?.id || null,
        email: body.userEmail || userContext.user?.email || null,
        role: body.userRole || userContext.role,
      },
      triage: {
        canAccessAllOrganizations: userContext.canAccessAllOrganizations,
      },
    };

    const webhookUrl = process.env.SUPPORT_TICKET_WEBHOOK_URL;
    const webhookToken = process.env.SUPPORT_TICKET_WEBHOOK_TOKEN;

    if (!webhookUrl) {
      return NextResponse.json({
        ticketId: `local-${Date.now()}`,
        status: "queued_local_only",
        message:
          "Webhook ticket non configurato. Imposta SUPPORT_TICKET_WEBHOOK_URL per invio verso Matris o altra organizzazione.",
      });
    }

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
      },
      body: JSON.stringify(ticketPayload),
    });

    const webhookText = await webhookResponse.text();
    if (!webhookResponse.ok) {
      return NextResponse.json(
        {
          error: "External ticket provider rejected request.",
          providerStatus: webhookResponse.status,
          providerResponse: webhookText.slice(0, 500),
        },
        { status: 502 }
      );
    }

    let parsedResponse: any = null;
    try {
      parsedResponse = webhookText ? JSON.parse(webhookText) : null;
    } catch {
      parsedResponse = null;
    }

    return NextResponse.json({
      ticketId:
        parsedResponse?.ticketId ||
        parsedResponse?.id ||
        `ext-${Date.now()}`,
      status: "created",
      providerResponse: parsedResponse,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create support ticket",
      },
      { status: 500 }
    );
  }
}
