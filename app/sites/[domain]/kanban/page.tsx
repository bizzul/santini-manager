import React from "react";
import { redirect } from "next/navigation";
import { Action, SellProduct, Task } from "@/types/supabase";
import ContentPage from "@/components/kanbans/ContentPage";
import { getAvailableSnapshots } from "./actions/get-available-snapshots.action";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getData(): Promise<any> {
  const supabase = await createClient();
  const { data: clients, error: clientsError } = await supabase
    .from("Client")
    .select("*");
  const { data: products, error: productsError } = await supabase
    .from("SellProduct")
    .select("*");
  const { data: history, error: historyError } = await supabase
    .from("Action")
    .select("*");

  const { data: tasks, error: tasksError } = await supabase
    .from("Task")
    .select("*");

  return { clients, products, history, tasks };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const supabase = await createClient();
  const data = await getData();
  const userContext = await getUserContext();

  if (!userContext || !userContext.user) {
    return redirect("/login");
  }

  const { user } = userContext;
  const sp = await searchParams;
  let kanName = sp.name;

  if (typeof kanName === "string") {
    kanName = kanName.toUpperCase();
  }

  // Fetch kanban data server-side
  const kanban = await supabase
    .from("kanban")
    .select("*")
    .eq("identifier", kanName)
    .single();

  // Fetch initial tasks server-side
  const initialTasks = await fetch(
    `${process.env.NEXT_PUBLIC_URL}/api/kanban/tasks`,
    {
      cache: "no-store",
    }
  ).then((res) => res.json());

  const snapshots = await getAvailableSnapshots();

  return (
    <ContentPage
      kanName={kanName!}
      clients={data.clients}
      products={data.products}
      history={data.history}
      initialTasks={initialTasks}
      snapshots={snapshots}
      kanban={kanban} // Pass the kanban data
    />
  );
}
