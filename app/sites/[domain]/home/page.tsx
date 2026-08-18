import { redirect } from "next/navigation";

/**
 * Home is no longer a landing page. Deep links to `/home` keep working
 * by redirecting to Overview (`/dashboard`).
 */
export default async function SiteHomeRedirect({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  redirect(`/sites/${domain}/dashboard`);
}
