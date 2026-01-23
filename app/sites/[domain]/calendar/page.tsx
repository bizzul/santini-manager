import React from "react";
import { Task, Kanban } from "@/types/supabase";
import CalendarComponent from "@/components/calendar/calendarComponent";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { requireServerSiteContext } from "@/lib/server-data";

export type TaskWithKanban = Task & {
  Kanban?: Pick<Kanban, "id" | "color" | "title"> | null;
};

async function getData(siteId: string): Promise<TaskWithKanban[]> {
  // Fetch data from your API here.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("Task")
    .select(`
      *,
      Kanban (
        id,
        color,
        title
      )
    `)
    .eq("site_id", siteId)
    .eq("archived", false);
  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }

  return data;
}

async function Page({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const resolvedParams = await params;
  const domain = resolvedParams.domain;

  const userContext = await getUserContext();

  if (!userContext || !userContext.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }

  // Get site context (required for multi-tenant)
  const siteContext = await requireServerSiteContext(domain);
  const { siteId } = siteContext;

  //get initial data filtered by siteId
  const data = await getData(siteId);

  return (
    <div className="container w-full mx-auto relative ">
      <CalendarComponent tasks={data as TaskWithKanban[]} />
    </div>
  );
}

export default Page;
