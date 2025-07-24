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

  const allPaths =
    allSites
      ?.flatMap(
        ({
          subdomain,
          custom_domain,
        }: {
          subdomain: string;
          custom_domain: string;
        }) => [
          subdomain && {
            domain: `${subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
          },
          custom_domain && {
            domain: custom_domain,
          },
        ]
      )
      .filter(Boolean) || [];

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
