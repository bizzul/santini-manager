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

export default async function Page({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  // Authentication
  const userContext = await getUserContext();
  if (!userContext?.user) {
    return redirect("/login");
  }

  // Get site context (required)
  const { siteId } = await requireServerSiteContext(domain);
  const verticalProfile = await fetchSiteVerticalProfile(siteId);

  // Fetch reports data and enabled modules in parallel
  const [data, enabledModules] = await Promise.all([
    fetchReportsData(siteId),
    getEnabledModuleNames(siteId),
  ]);

  // Check if user is admin (can see all reports)
  const isAdmin = userContext.role !== "user";

  return (
    <div className="p-4 h-screen">
      <div className="pb-12">
        <h1 className="text-2xl font-bold">
          {verticalProfile.pageCopy.reportsTitle}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {verticalProfile.pageCopy.reportsSubtitle}
        </p>
      </div>
      <GridReports
        suppliers={data.suppliers}
        qc={data.qualityControl}
        imb={data.packingControl}
        task={data.tasks}
        inventoryCategories={data.inventoryCategories}
        clients={data.clients}
        sellProducts={data.sellProducts}
        users={data.users}
        domain={domain}
        isAdmin={isAdmin}
        enabledModules={enabledModules}
      />
    </div>
  );
}
