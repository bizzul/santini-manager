import { redirect } from "next/navigation";
import {
  fetchFactoryDashboardData,
  fetchSiteModules,
  requireServerSiteContext,
} from "@/lib/server-data";
import { getUserContext } from "@/lib/auth-utils";
import { canAccessModule, isAdminOrSuperadmin } from "@/lib/permissions";
import { PageContent, PageHeader, PageLayout } from "@/components/page-layout";
import { FactoryDashboard } from "@/components/factory";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  try {
    const siteContext = await requireServerSiteContext(domain);
    return {
      title: `${siteContext.siteData?.name || "Site"} - Fabbrica`,
    };
  } catch {
    return {
      title: "Fabbrica",
    };
  }
}

export default async function FactoryPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const siteContext = await requireServerSiteContext(domain);
  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  const modules = await fetchSiteModules(siteContext.siteId);
  const factoryModule = modules.find((module) => module.name === "factory");

  if (!factoryModule?.isEnabled) {
    redirect(`/sites/${domain}`);
  }

  if (!isAdminOrSuperadmin(userContext.role)) {
    const hasFactoryAccess = await canAccessModule(
      userContext.userId || userContext.user.id,
      siteContext.siteId,
      "factory",
      userContext.role
    );

    if (!hasFactoryAccess) {
      redirect(`/sites/${domain}`);
    }
  }

  const factoryData = await fetchFactoryDashboardData(siteContext.siteId);

  return (
    <PageLayout>
      <PageHeader>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Fabbrica</h1>
          <p className="text-sm text-muted-foreground">
            Panoramica reparti, macchinari e stato prodotti in tempo reale.
          </p>
        </div>
      </PageHeader>

      <PageContent>
        <FactoryDashboard
          data={factoryData}
          domain={domain}
          siteId={siteContext.siteId}
        />
      </PageContent>
    </PageLayout>
  );
}
