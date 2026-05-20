import React from "react";
import { redirect } from "next/navigation";

import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchReportsData,
  getEnabledModuleNames,
  fetchSiteVerticalProfile,
} from "@/lib/server-data";
import GridReports from "@/components/reports/GridReports";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";

export default async function Page({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  const userContext = await getUserContext();
  if (!userContext?.user) {
    return redirect("/login");
  }

  const { siteId } = await requireServerSiteContext(domain);
  const verticalProfile = await fetchSiteVerticalProfile(siteId);

  const [data, enabledModules] = await Promise.all([
    fetchReportsData(siteId),
    getEnabledModuleNames(siteId),
  ]);

  const isAdmin = userContext.role !== "user";

  return (
    <PageLayout>
      <PageHeader
        title={verticalProfile.pageCopy.reportsTitle}
        subtitle={verticalProfile.pageCopy.reportsSubtitle}
      />
      <PageContent>
        <GridReports
          suppliers={data.suppliers}
          qc={data.qualityControl}
          imb={data.packingControl}
          task={data.tasks}
          inventoryCategories={data.inventoryCategories}
          clients={data.clients}
          sellProducts={data.sellProducts}
          users={data.users}
          kanbans={data.kanbans}
          domain={domain}
          isAdmin={isAdmin}
          enabledModules={enabledModules}
        />
      </PageContent>
    </PageLayout>
  );
}
