import React from "react";
import { redirect } from "next/navigation";

import ContentPage from "@/components/kanbans/ContentPage";
import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchKanbanWithTasks,
  fetchSingleKanban,
} from "@/lib/server-data";
import { PageLayout } from "@/components/page-layout";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
  params,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
  params: Promise<{ domain: string }>;
}) {
  const resolvedParams = await params;
  const domain = resolvedParams.domain;
  const sp = await searchParams;
  const kanName = sp.name;

  const userContext = await getUserContext();
  if (!userContext || !userContext.user) {
    return redirect("/login");
  }

  const siteContext = await requireServerSiteContext(domain);
  const { siteId } = siteContext;

  const [kanbanData, kanban] = await Promise.all([
    fetchKanbanWithTasks(siteId, kanName),
    kanName ? fetchSingleKanban(siteId, kanName) : Promise.resolve(null),
  ]);

  // The Kanban board renders its own immersive, color-driven header (matching
  // the kanban color), so the page intentionally omits PageHeader and lets the
  // board occupy the full content area inside the PageLayout shell.
  return (
    <PageLayout>
      <ContentPage
        kanName={kanName!}
        clients={kanbanData.clients}
        products={kanbanData.products}
        categories={kanbanData.categories}
        history={kanbanData.history}
        initialTasks={kanbanData.tasks}
        kanban={kanban}
        domain={domain}
      />
    </PageLayout>
  );
}
