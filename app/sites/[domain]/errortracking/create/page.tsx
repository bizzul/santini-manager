import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import React from "react";
import { createClient } from "@/utils/server";
import MobilePage from "@/components/errorTracking/mobilePage";

async function getData(): Promise<any> {
  const supabase = await createClient();
  const { data: tasks, error: tasksError } = await supabase
    .from("task")
    .select("*")
    .order("created_at", { ascending: false });
  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("*");
  const { data: suppliers, error: suppliersError } = await supabase
    .from("supplier")
    .select("*");
  const { data: categories, error: categoriesError } = await supabase
    .from("product_category")
    .select("*");

  return { tasks, roles, suppliers, categories };
}

async function Page() {
  const userContext = await getUserContext();
  if (!userContext || !userContext.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }
  const returnLink = `/api/auth/login?returnTo=${encodeURIComponent(
    "/errortracking/create"
  )}`;
  if (!userContext || !userContext.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect(returnLink);
  }
  // Now it's safe to use session.user
  const { user } = userContext;

  //get initial data
  const data = await getData();

  return <MobilePage data={data} session={userContext} />;
}

export default Page;
