import React from "react";
import { redirect } from "next/navigation";
import { Action, SellProduct, Task } from "@/types/supabase";
import ContentPage from "@/components/kanbans/ContentPage";
import { getAvailableSnapshots } from "./actions/get-available-snapshots.action";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getData(domain?: string): Promise<any> {
  const supabase = await createClient();
  let siteId = null;
  let organizationId = null;

  // Get site information
  if (domain) {
    try {
      const siteResult = await getSiteData(domain);
      if (siteResult?.data) {
        siteId = siteResult.data.id;
        organizationId = siteResult.data.organization_id;
      }
    } catch (error) {
      console.error("Error fetching site data:", error);
    }
  }

  // Get clients filtered by site_id if available
  let clientsQuery = supabase.from("Client").select("*");
  if (siteId) {
    clientsQuery = clientsQuery.eq("site_id", siteId);
  }
  const { data: clients, error: clientsError } = await clientsQuery;

  // Get products filtered by site_id if available
  let productsQuery = supabase.from("SellProduct").select("*");
  if (siteId) {
    productsQuery = productsQuery.eq("site_id", siteId);
  }
  const { data: products, error: productsError } = await productsQuery;

  // Get history filtered by site_id if available
  let historyQuery = supabase.from("Action").select("*");
  if (siteId) {
    historyQuery = historyQuery.eq("site_id", siteId);
  }
  const { data: history, error: historyError } = await historyQuery;

  // Get tasks filtered by site_id if available
  let tasksQuery = supabase.from("Task").select("*");
  if (siteId) {
    tasksQuery = tasksQuery.eq("site_id", siteId);
  }
  const { data: tasks, error: tasksError } = await tasksQuery;

  return { clients, products, history, tasks };
}

export default async function Page({
  searchParams,
  params,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
  params: Promise<{ domain: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const domain = resolvedParams.domain;

  const data = await getData(domain);
  const userContext = await getUserContext();

  if (!userContext || !userContext.user) {
    return redirect("/login");
  }

  const { user } = userContext;
  const sp = await searchParams;
  let kanName = sp.name;

  // Keep the original identifier case - don't convert to uppercase
  // The identifier is saved in lowercase in the database

  // Get site information for kanban filtering
  let siteId = null;
  try {
    const siteResult = await getSiteData(domain);
    if (siteResult?.data) {
      siteId = siteResult.data.id;
    }
  } catch (error) {
    console.error("Error fetching site data:", error);
  }

  // Fetch kanban data server-side with site_id filtering
  let kanbanQuery = supabase
    .from("Kanban")
    .select(
      `
      *,
      columns:KanbanColumn(*)
    `
    )
    .eq("identifier", kanName)
    .order("position", { referencedTable: "KanbanColumn" });

  if (siteId) {
    kanbanQuery = kanbanQuery.eq("site_id", siteId);
  }

  const { data: kanban, error: kanbanError } = await kanbanQuery.single();

  // Fetch initial tasks server-side with site headers
  const initialTasks = await fetch(
    `${process.env.NEXT_PUBLIC_URL}/api/kanban/tasks`,
    {
      cache: "no-store",
      headers: {
        "x-site-id": siteId || "",
        host: domain,
      },
    }
  ).then((res) => res.json());

  const snapshots = await getAvailableSnapshots(domain);

  return (
    <ContentPage
      kanName={kanName!}
      clients={data.clients}
      products={data.products}
      history={data.history}
      initialTasks={initialTasks}
      snapshots={snapshots}
      kanban={kanban} // Pass the kanban data
      domain={domain} // Pass the domain
    />
  );
}
