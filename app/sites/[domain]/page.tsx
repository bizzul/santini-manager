import { notFound, redirect } from "next/navigation";
import { getSiteData } from "@/lib/fetchers";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function SiteHomePage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  // Check if domain includes the root domain, if not, append it
  let fullDomain = domain;
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost";

  if (!domain.includes(rootDomain)) {
    fullDomain = `${domain}.${rootDomain}`;
  }

  console.log(`Processing domain: ${domain} -> ${fullDomain}`);

  const [data] = await Promise.all([getSiteData(fullDomain)]);

  if (!data?.data) {
    console.log(`Site not found for domain: ${fullDomain}`);
    notFound();
  }

  console.log(`Redirecting to dashboard for site: ${data.data.name}`);

  // Redirect to the site-specific dashboard
  redirect(`/sites/${fullDomain}/dashboard`);
}
