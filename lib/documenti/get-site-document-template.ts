import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import {
  resolveSiteDocumentTemplate,
  type SiteTemplateSource,
} from "@/lib/documenti/resolve-site-document-template";
import type { DocumentTemplate } from "@/lib/documenti/template-types";
import type { DocumentTemplateConfig } from "@/lib/documenti/template-types";

async function loadSiteTemplateSource(
  siteId: string,
): Promise<SiteTemplateSource | null> {
  const supabase = await createClient();

  const { data: site } = await supabase
    .from("sites")
    .select("name, logo, document_template_config, organization_id")
    .eq("id", siteId)
    .single();

  if (!site) return null;

  let organizationName: string | null = null;
  if (site.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", site.organization_id)
      .maybeSingle();
    organizationName = org?.name ?? null;
  }

  return {
    name: site.name,
    logo: site.logo,
    document_template_config: (site.document_template_config ??
      {}) as DocumentTemplateConfig,
    organizationName,
  };
}

export const getSiteDocumentTemplate = cache(
  async (siteId: string): Promise<DocumentTemplate> => {
    const source = await loadSiteTemplateSource(siteId);
    if (!source) {
      return resolveSiteDocumentTemplate({});
    }
    return resolveSiteDocumentTemplate(source);
  },
);

export async function getSiteDocumentTemplateByDomain(
  domain: string,
): Promise<DocumentTemplate | null> {
  const supabase = await createClient();

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost";
  const domainWithoutPort = domain.split(":")[0];
  const isFullDomain = domainWithoutPort.endsWith(`.${rootDomain}`);
  const subdomain = isFullDomain
    ? domainWithoutPort.replace(`.${rootDomain}`, "")
    : domainWithoutPort;

  const { data: site } = await supabase
    .from("sites")
    .select("name, logo, document_template_config, organization_id")
    .eq("subdomain", subdomain)
    .single();

  if (!site) return null;

  let organizationName: string | null = null;
  if (site.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", site.organization_id)
      .maybeSingle();
    organizationName = org?.name ?? null;
  }

  return resolveSiteDocumentTemplate({
    name: site.name,
    logo: site.logo,
    document_template_config: (site.document_template_config ??
      {}) as DocumentTemplateConfig,
    organizationName,
  });
}
