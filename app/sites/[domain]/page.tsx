import { notFound, redirect } from "next/navigation";
import { getSiteData } from "@/lib/fetchers";
import { createClient } from "@/utils/supabase/server";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
