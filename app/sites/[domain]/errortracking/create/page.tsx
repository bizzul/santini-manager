import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import React from "react";
import { createServiceClient } from "@/utils/supabase/server";
import MobilePage from "@/components/errorTracking/mobilePage";
import { requireServerSiteContext } from "@/lib/server-data";

async function getData(siteId: string): Promise<any> {
  const supabase = createServiceClient();
  const { data: tasks, error: tasksError } = await supabase
    .from("Task")
    .select("id, unique_code, title, Client(businessName, individualFirstName, individualLastName)")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });
  const { data: roles, error: rolesError } = await supabase
    .from("Roles")
    .select("*")
    .or(`site_id.eq.${siteId},site_id.is.null`);
  const { data: suppliers, error: suppliersError } = await supabase
    .from("Supplier")
    .select("*, supplier_category:Product_category(name)")
    .eq("site_id", siteId);
  const { data: categories, error: categoriesError } = await supabase
    .from("Product_category")
    .select("*")
    .eq("site_id", siteId);

  return { tasks, roles, suppliers, categories };
}

async function Page({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

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

  return <MobilePage data={data} session={userContext} />;
}

export default Page;
