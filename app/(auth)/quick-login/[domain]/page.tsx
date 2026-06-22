import { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuickLoginClient } from "../quick-login-client";
import { getSiteActiveUsers, resolveSite } from "../data";

export const metadata: Metadata = {
  title: "Accesso rapido | Santini Manager",
};

// Always render fresh: the kiosk should reflect the current active users.
export const dynamic = "force-dynamic";

export default async function QuickLoginPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  const site = await resolveSite(domain);
  if (!site) {
    notFound();
  }

  let loadError = false;
  let users: Awaited<ReturnType<typeof getSiteActiveUsers>> = [];
  try {
    users = await getSiteActiveUsers(site);
  } catch {
    loadError = true;
  }

  return (
    <QuickLoginClient
      domain={domain}
      siteName={site.name}
      users={users}
      loadError={loadError}
    />
  );
}
