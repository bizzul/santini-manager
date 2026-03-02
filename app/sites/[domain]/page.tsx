import { notFound, redirect } from "next/navigation";
import { getServerSiteContext } from "@/lib/server-data";
import { getUserContext } from "@/lib/auth-utils";
import { canAccessModule, isAdminOrSuperadmin, getUserPermissions } from "@/lib/permissions";
import { UserHomeMinimal } from "@/components/user-home-minimal";

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

  const userContext = await getUserContext();
  
  if (!userContext) {
    redirect("/login");
  }

  // Admin/superadmin always have access to dashboard
  if (isAdminOrSuperadmin(userContext.role)) {
    redirect(`/sites/${domain}/dashboard`);
  }

  // Check if user has dashboard permission
  const hasDashboardAccess = await canAccessModule(
    userContext.userId || userContext.user.id,
    siteContext.siteId,
    "dashboard",
    userContext.role
  );

  if (hasDashboardAccess) {
    redirect(`/sites/${domain}/dashboard`);
  }

  // User doesn't have dashboard access - show home minimal
  const permissions = await getUserPermissions(
    userContext.userId || userContext.user.id,
    siteContext.siteId
  );

  const userName = userContext.user?.user_metadata?.given_name || 
                   userContext.user?.user_metadata?.full_name?.split(" ")[0] || 
                   "";

  return (
    <UserHomeMinimal
      userName={userName}
      domain={domain}
      availableModules={permissions?.modules || []}
    />
  );
}
