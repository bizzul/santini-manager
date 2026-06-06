import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import {
  mergeDocumentTemplate,
  type DocumentTemplate,
  type DocumentTemplateConfig,
} from "@/lib/documenti/template-types";

export const getSiteDocumentTemplate = cache(
  async (siteId: string): Promise<DocumentTemplate> => {
    const supabase = await createClient();

    const { data: site } = await supabase
      .from("sites")
      .select("document_template_config, logo")
      .eq("id", siteId)
      .single();

    const config = (site?.document_template_config ??
      {}) as DocumentTemplateConfig;

    return mergeDocumentTemplate(config, site?.logo ?? null);
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
    .select("id, document_template_config, logo")
    .eq("subdomain", subdomain)
    .single();

  if (!site) return null;

  const config = (site.document_template_config ??
    {}) as DocumentTemplateConfig;

  return mergeDocumentTemplate(config, site.logo ?? null);
}
