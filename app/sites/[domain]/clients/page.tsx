import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchClients,
  fetchClientRowInsights,
  fetchSiteVerticalProfile,
} from "@/lib/server-data";
import { getServerT } from "@/lib/i18n/server";
import DialogCreate from "./dialogCreate";
import DialogImportCSV from "./dialogImportCSV";
import ButtonExportCSV from "./buttonExportCSV";
import { ClientsPageClient } from "./clients-page-client";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { EmptyState } from "@/components/layout/empty-state";
import { Users } from "lucide-react";

export default async function Page({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  // Authentication
  const userContext = await getUserContext();
  if (!userContext) {
    return redirect("/login");
  }

  // Get site context (required)
  const { siteId } = await requireServerSiteContext(domain);
  const verticalProfile = await fetchSiteVerticalProfile(siteId);
  const { t } = await getServerT(siteId);

  // Fetch data
  const [clients, rowInsights] = await Promise.all([
    fetchClients(siteId),
    fetchClientRowInsights(siteId),
  ]);

  return (
    <PageLayout>
      <PageHeader
        title={verticalProfile.pageCopy.clientsTitle}
        subtitle={verticalProfile.pageCopy.clientsSubtitle}
        actions={
          <>
            <ButtonExportCSV />
            <DialogImportCSV />
            <DialogCreate />
          </>
        }
      />
      <PageContent>
        {clients.length > 0 ? (
          <ClientsPageClient
            clients={clients}
            domain={domain}
            siteId={siteId}
            rowInsights={rowInsights}
          />
        ) : (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title={t("clients.pageEmptyTitle")}
            description={t("clients.pageEmptyDescription")}
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
