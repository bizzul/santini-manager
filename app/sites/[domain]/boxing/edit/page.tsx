import React from "react";
import { redirect } from "next/navigation";
import MobilePage from "@/components/boxing/mobilePage";

import { createClient } from "@/utils/server";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";

interface Data {
  packing: any[];
}

export const revalidate = 0;
async function getSellProducts(siteId: string): Promise<Data> {
  // Fetch data from your API here.
  // Fetch all the products

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("packing_control")
    .select("*")
    .eq("site_id", siteId)
    .eq("task.archived", false)
    .not("task.column.identifier", "eq", "SPEDITO");

  if (error) {
    console.error("Error fetching packing control:", error);
    return { packing: [] };
  }

  return { packing: data };
}

async function Page({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  const userContext = await getUserContext();
  const returnLink = `/api/auth/login?returnTo=${encodeURIComponent(
    "/boxing/edit"
  )}`;
  if (!userContext || !userContext.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect(returnLink);
  }

  // Get site context (required for multi-tenant)
  const siteContext = await requireServerSiteContext(domain);
  const { siteId } = siteContext;

  //get initial data filtered by siteId
  const data = await getSellProducts(siteId);

  // Now it's safe to use session.user
  const { user } = userContext;

  return <MobilePage data={data} session={user} />;
}

export default Page;
