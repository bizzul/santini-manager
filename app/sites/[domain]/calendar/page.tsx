import React from "react";
import { Task, Kanban } from "@/types/supabase";
import CalendarComponent from "@/components/calendar/calendarComponent";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export type TaskWithKanban = Task & {
  Kanban?: Pick<Kanban, "id" | "color" | "title"> | null;
};

async function getData(): Promise<TaskWithKanban[]> {
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
    .eq("archived", false);
  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }

  return data;
}

async function Page() {
  //get initial data
  const data = await getData();

  const userContext = await getUserContext();

  if (!userContext || !userContext.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }

  return (
    <div className="container w-full mx-auto relative ">
      <CalendarComponent tasks={data as TaskWithKanban[]} />
    </div>
  );
}

export default Page;
