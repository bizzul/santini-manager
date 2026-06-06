import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { SaveDocumentRequestSchema } from "@/validation/documenti/extracted-document";
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

    const { data, error } = await supabase
      .from("documenti")
      .select(
        "id, tipo_documento, numero, anno, oggetto, status, tot_netto, totale_chf, created_at, destinatario, corpo_testo, pdf_url, allegati",
      )
      .eq("site_id", siteId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      log.warn("Failed to fetch documenti", error);
      return NextResponse.json([]);
    }

    return NextResponse.json(data ?? []);
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
    const saved = await saveDocumento(serviceClient, siteId, documento, {
      sourceText,
      taskId: taskId ?? null,
      status: "final",
      documentoId,
    });

    return NextResponse.json({
      success: true,
      documento: saved,
    });
  } catch (error) {
    log.error("POST documenti failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante il salvataggio del documento",
      },
      { status: 500 },
    );
  }
}
