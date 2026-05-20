import React from "react";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext, fetchReportsData } from "@/lib/server-data";
import GridReports from "@/components/reports/GridReports";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { EmptyState } from "@/components/layout/empty-state";

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
  const data = await fetchReportsData(siteId);

  return (
    <PageLayout>
      <PageHeader
        title="Quality control"
        subtitle="Controlli qualita registrati per le commesse"
      />
      <PageContent>
        {data.qualityControl.length > 0 ? (
          <GridReports
            suppliers={data.suppliers}
            imb={[]}
            qc={data.qualityControl}
            task={data.tasks}
            domain={domain}
          />
        ) : (
          <EmptyState
            icon={<ShieldCheck className="h-6 w-6" />}
            title="Nessun quality control creato"
            description="I controlli qualita compariranno qui non appena saranno completati."
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
