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

  // Fetch data
  const data = await fetchReportsData(siteId);

  return (
    <div className="container">
      {data.qualityControl.length > 0 ? (
        <GridReports
          suppliers={data.suppliers}
          imb={[]}
          qc={data.qualityControl}
          task={data.tasks}
        />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">Nessun quality control creato!</h1>
        </div>
      )}
    </div>
  );
}
