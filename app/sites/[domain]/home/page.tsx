import { notFound, redirect } from "next/navigation";
import { getServerSiteContext } from "@/lib/server-data";
import { getUserContext } from "@/lib/auth-utils";
import { canAccessModule, getUserModules } from "@/lib/permissions";
import { AVAILABLE_MODULES } from "@/lib/module-config";
import { UserHomeMinimal } from "@/components/user-home-minimal";

export default async function SiteUniversalHomePage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  const siteContext = await getServerSiteContext(domain);

  if (!siteContext) {
    notFound();
  }

  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  const userId = userContext.userId || userContext.user.id;
  const userModules = await getUserModules(
    userId,
    siteContext.siteId,
    userContext.role
  );

  const availableModules =
    userModules === "all"
      ? AVAILABLE_MODULES.map((module) => module.name)
      : userModules;

  const hasDashboardAccess = await canAccessModule(
    userId,
    siteContext.siteId,
    "dashboard",
    userContext.role
  );

  const userName =
    userContext.user?.user_metadata?.given_name ||
    userContext.user?.user_metadata?.full_name?.split(" ")[0] ||
    "";

  return (
    <UserHomeMinimal
      userName={userName}
      domain={domain}
      availableModules={availableModules}
      showDashboard={hasDashboardAccess}
    />
  );
}
