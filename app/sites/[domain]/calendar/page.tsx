import React from "react";
import { Task } from "@/types/supabase";
import CalendarComponent from "@/components/calendar/calendarComponent";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getData(): Promise<Task[]> {
  // Fetch data from your API here.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task")
    .select("*")
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
  // Now it's safe to use session.user
  const { user } = userContext;

  return (
    <div className="container mx-auto relative ">
      <CalendarComponent tasks={data} />
    </div>
  );
}

export default Page;
