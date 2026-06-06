import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import type { DocumentTemplateConfig } from "@/lib/documenti/template-types";
import {
  getDocumentTemplateMissingLabels,
  resolveSiteDocumentTemplate,
} from "@/lib/documenti/resolve-site-document-template";

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  try {
    const { domain } = await params;
    const siteResult = await getSiteData(domain);
    if (!siteResult?.data) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const supabase = await createClient();
    const { data: site } = await supabase
      .from("sites")
      .select("name, document_template_config, logo, organization_id")
      .eq("id", siteResult.data.id)
      .single();

    let organizationName: string | null = null;
    if (site?.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", site.organization_id)
        .maybeSingle();
      organizationName = org?.name ?? null;
    }

    const resolved = resolveSiteDocumentTemplate({
      name: site?.name,
      logo: site?.logo,
      document_template_config: (site?.document_template_config ??
        {}) as DocumentTemplateConfig,
      organizationName,
    });

    return NextResponse.json({
      config: (site?.document_template_config ?? {}) as DocumentTemplateConfig,
      logoUrl: site?.logo ?? null,
      siteName: site?.name ?? null,
      resolvedMittente: resolved.mittente,
      missingFields: getDocumentTemplateMissingLabels(resolved),
      pageFormat: resolved.pageFormat,
    });
  } catch (error) {
    console.error("Error fetching document template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  try {
    const { domain } = await params;
    const siteResult = await getSiteData(domain);
    if (!siteResult?.data) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

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
      siteResult.data.id,
      siteResult.data.organization_id,
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const config = body.config as DocumentTemplateConfig;

    const { error } = await supabase
      .from("sites")
      .update({ document_template_config: config })
      .eq("id", siteResult.data.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving document template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
