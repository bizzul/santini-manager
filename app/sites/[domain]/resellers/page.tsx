import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { fetchResellers, requireServerSiteContext } from "@/lib/server-data";
import { getServerT } from "@/lib/i18n/server";
import DialogCreate from "./dialogCreate";
import DataWrapper from "./dataWrapper";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { EmptyState } from "@/components/layout/empty-state";
import { Store } from "lucide-react";

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
  const [{ t }, resellers] = await Promise.all([
    getServerT(siteId),
    fetchResellers(siteId),
  ]);

  return (
    <PageLayout>
      <PageHeader
        title={t("resellers.pageTitle")}
        subtitle={t("resellers.pageSubtitle")}
        actions={<DialogCreate domain={domain} />}
      />
      <PageContent>
        {resellers.length > 0 ? (
          <DataWrapper data={resellers} domain={domain} />
        ) : (
          <EmptyState
            icon={<Store className="h-6 w-6" />}
            title={t("resellers.emptyTitle")}
            description={t("resellers.emptyDescription")}
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
