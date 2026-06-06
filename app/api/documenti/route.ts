import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { SaveDocumentRequestSchema } from "@/validation/documenti/extracted-document";
import {
  createOfferTaskFromDocument,
  OfferKanbanNotConfiguredError,
  shouldCreateOfferTaskForDocument,
} from "@/lib/documenti/create-offer-task-from-document";
import { fetchSiteDocumenti } from "@/lib/documenti/fetch-site-documenti";
import { saveDocumento } from "@/lib/documenti/save-document";
import { logger } from "@/lib/logger";

const log = logger.scope("DocumentiAPI");

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siteDomain = req.headers.get("x-site-domain");
    let siteId: string | null = null;

    if (siteDomain) {
      const context = await getSiteContextFromDomain(siteDomain);
      siteId = context.siteId;
    } else {
      const context = await getSiteContext(req);
      siteId = context.siteId;
    }

    if (!siteId) {
      return NextResponse.json({ error: "Site ID required" }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const data = await fetchSiteDocumenti(serviceClient, siteId);

    return NextResponse.json(data);
  } catch (error) {
    log.error("GET documenti failed", error);
    return NextResponse.json(
      { error: "Errore nel recupero documenti" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siteDomain = req.headers.get("x-site-domain");
    let siteId: string | null = null;

    if (siteDomain) {
      const context = await getSiteContextFromDomain(siteDomain);
      siteId = context.siteId;
    } else {
      const context = await getSiteContext(req);
      siteId = context.siteId;
    }

    if (!siteId) {
      return NextResponse.json({ error: "Site ID required" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = SaveDocumentRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validazione fallita", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const {
      sourceText,
      taskId,
      documentoId,
      totali: _ignoredTotali,
      ...documento
    } = parsed.data;

    const serviceClient = createServiceClient();

    let resolvedTaskId = taskId ?? null;
    let offerCode: string | null = null;
    let offerCreated = false;

    if (shouldCreateOfferTaskForDocument(documento, resolvedTaskId)) {
      const offerTask = await createOfferTaskFromDocument(
        serviceClient,
        siteId,
        documento,
      );
      resolvedTaskId = offerTask.taskId;
      offerCode = offerTask.uniqueCode;
      offerCreated = true;
    }

    const saved = await saveDocumento(serviceClient, siteId, documento, {
      sourceText,
      taskId: resolvedTaskId,
      status: "final",
      documentoId,
    });

    if (siteDomain) {
      revalidatePath(`/sites/${siteDomain}/documenti`);
    }

    return NextResponse.json({
      success: true,
      documento: {
        ...saved,
        taskId: resolvedTaskId,
        offerCode,
        offerCreated,
      },
    });
  } catch (error) {
    log.error("POST documenti failed", error);

    if (error instanceof OfferKanbanNotConfiguredError) {
      return NextResponse.json(
        {
          error: error.message,
          message: error.message,
          errors: [error.message],
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante il salvataggio del documento",
        message:
          error instanceof Error
            ? error.message
            : "Errore durante il salvataggio del documento",
      },
      { status: 500 },
    );
  }
}
