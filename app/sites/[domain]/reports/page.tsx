import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext, fetchReportsData } from "@/lib/server-data";
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

  // Fetch reports data
  const data = await fetchReportsData(siteId);

  // Check if user is admin (can see all reports)
  const isAdmin = userContext.role !== "user";

  return (
    <div className="p-4 h-screen">
      <h1 className="text-2xl font-bold pb-12">
        Crea i documenti di reportistica
      </h1>
      <GridReports
        suppliers={data.suppliers}
        qc={data.qualityControl}
        imb={data.packingControl}
        task={data.tasks}
        domain={domain}
        isAdmin={isAdmin}
      />
    </div>
  );
}
