import React from "react";
import { redirect } from "next/navigation";
import ContentPage from "@/components/kanbans/ContentPage";
import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchKanbanWithTasks,
  fetchSingleKanban,
} from "@/lib/server-data";

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

  // Authentication check
  const userContext = await getUserContext();
  if (!userContext || !userContext.user) {
    return redirect("/login");
  }

  // Get site context (required for multi-tenant)
  const siteContext = await requireServerSiteContext(domain);
  const { siteId } = siteContext;

  // Fetch all data in parallel using server-side utilities
  const [kanbanData, kanban] = await Promise.all([
    fetchKanbanWithTasks(siteId, kanName),
    kanName ? fetchSingleKanban(siteId, kanName) : Promise.resolve(null),
  ]);

  return (
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
  );
}
