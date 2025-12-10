import React from "react";
import { redirect } from "next/navigation";
import ContentPage from "@/components/kanbans/ContentPage";
import { getAvailableSnapshots } from "./actions/get-available-snapshots.action";
import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchKanbanWithTasks,
  fetchSingleKanban,
} from "@/lib/server-data";

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
  const [kanbanData, kanban, snapshots] = await Promise.all([
    fetchKanbanWithTasks(siteId),
    kanName ? fetchSingleKanban(siteId, kanName) : Promise.resolve(null),
    getAvailableSnapshots(domain),
  ]);

  return (
    <ContentPage
      kanName={kanName!}
      clients={kanbanData.clients}
      products={kanbanData.products}
      history={kanbanData.history}
      initialTasks={kanbanData.tasks}
      snapshots={snapshots}
      kanban={kanban}
      domain={domain}
    />
  );
}
