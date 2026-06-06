import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import {
  DOCUMENT_AI_CONFIG_MISSING_MESSAGE,
  resolveAiConfigForDocuments,
} from "@/lib/ai/resolve-ai-config";
import { createModelFromAiConfig } from "@/lib/documenti/get-document-ai-model";
import { mapAiProviderError } from "@/lib/ai/map-ai-errors";
import type { DocumentTemplateConfig } from "@/lib/documenti/template-types";
import { extractTextFromTemplateBuffer } from "@/lib/documenti/extract-template-text";
import { analyzeTemplateStructure } from "@/lib/documenti/analyze-template-structure";

async function checkSiteAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  siteId: string,
  organizationId: string | null,
): Promise<boolean> {
  const { data: userProfile } = await supabase
    .from("User")
    .select("role")
    .eq("authId", userId)
    .single();

  if (userProfile?.role === "superadmin") return true;

  const { data: userSite } = await supabase
    .from("user_sites")
    .select("site_id")
    .eq("user_id", userId)
    .eq("site_id", siteId)
    .maybeSingle();

  if (userSite) return true;

  if (organizationId) {
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (userOrg) return true;
  }

  return false;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  try {
    const { domain } = await params;
    const siteResult = await getSiteData(domain);
    if (!siteResult?.data) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const siteId = siteResult.data.id;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await checkSiteAccess(
      supabase,
      user.id,
      siteId,
      siteResult.data.organization_id,
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: site } = await supabase
      .from("sites")
      .select("document_template_config")
      .eq("id", siteId)
      .single();

    const config = (site?.document_template_config ??
      {}) as DocumentTemplateConfig;

    if (!config.referenceDocument?.storagePath && !config.templateModelText) {
      return NextResponse.json(
        {
          error:
            "Carica un documento di riferimento o inserisci un modello testuale prima di analizzare",
        },
        { status: 400 },
      );
    }

    const aiConfig = await resolveAiConfigForDocuments(siteId);
    if (!aiConfig) {
      return NextResponse.json(
        {
          error: "API key AI non configurata",
          message: DOCUMENT_AI_CONFIG_MISSING_MESSAGE,
        },
        { status: 400 },
      );
    }

    let extractedText = config.templateModelText?.trim() ?? "";

    if (config.referenceDocument?.storagePath) {
      const serviceClient = createServiceClient();
      const { data: fileData, error: downloadError } =
        await serviceClient.storage
          .from("documents")
          .download(config.referenceDocument.storagePath);

      if (downloadError || !fileData) {
        return NextResponse.json(
          { error: "Impossibile scaricare il documento di riferimento" },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());
      const extracted = await extractTextFromTemplateBuffer(
        buffer,
        config.referenceDocument.mimeType,
        config.referenceDocument.name,
      );
      extractedText = extractedText
        ? `${extractedText}\n\n---\n\n${extracted.content}`
        : extracted.content;
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "Nessun testo estraibile dal modello caricato" },
        { status: 400 },
      );
    }

    const model = createModelFromAiConfig(aiConfig);
    const structureMap = await analyzeTemplateStructure({
      model,
      extractedText,
      templateModelText: config.templateModelText,
    });

    const updatedConfig: DocumentTemplateConfig = {
      ...config,
      structureMap,
      structureAnalyzedAt: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("sites")
      .update({ document_template_config: updatedConfig })
      .eq("id", siteId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      structureMap,
      analyzedAt: updatedConfig.structureAnalyzedAt,
    });
  } catch (error) {
    console.error("Template analyze failed:", error);
    const mapped = mapAiProviderError(error);
    return NextResponse.json(
      {
        error: mapped.error ?? "Errore nell'analisi del modello",
        message: mapped.message,
      },
      { status: mapped.status ?? 500 },
    );
  }
}
