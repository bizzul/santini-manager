import { notFound, redirect } from "next/navigation";
import { getServerSiteContext } from "@/lib/server-data";

export default async function SiteHomePage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  const siteContext = await getServerSiteContext(domain);

  if (!siteContext) {
    notFound();
  }

  // Redirect to dashboard using just the subdomain from URL
  redirect(`/sites/${domain}/dashboard`);
}
