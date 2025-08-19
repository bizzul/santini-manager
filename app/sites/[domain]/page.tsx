import { notFound, redirect } from "next/navigation";
import { getSiteData } from "@/lib/fetchers";
import { createClient } from "@/utils/supabase/server";

export async function generateStaticParams() {
  const supabase = await createClient();
  // Fetch all sites from Supabase
  const { data: allSites, error } = await supabase
    .from("sites")
    .select("subdomain, custom_domain");

  if (error) {
    console.error("Error fetching sites:", error);
    return [];
  }

  const allPaths: { domain: string }[] = [];
  const processedDomains = new Set<string>();

  allSites?.forEach(({ subdomain, custom_domain }) => {
    // Handle subdomain
    if (subdomain && !processedDomains.has(subdomain)) {
      const subdomainPath = `${subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;
      allPaths.push({ domain: subdomainPath });
      processedDomains.add(subdomain);
    }

    // Handle custom domain (only if different from subdomain)
    if (
      custom_domain &&
      custom_domain !== subdomain &&
      !processedDomains.has(custom_domain)
    ) {
      allPaths.push({ domain: custom_domain });
      processedDomains.add(custom_domain);
    }
  });

  return allPaths;
}

export default async function SiteHomePage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  const [data] = await Promise.all([getSiteData(domain)]);

  if (!data?.data) {
    notFound();
  }

  // Redirect to the site-specific dashboard
  redirect(`/sites/${domain}/dashboard`);
}
