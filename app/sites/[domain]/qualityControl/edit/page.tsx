import React from "react";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import MobilePage from "@/components/qualityControl/mobilePage";
import { createClient } from "@/utils/server";
import { requireServerSiteContext } from "@/lib/server-data";

interface Data {
  quality: any[];
}

export const revalidate = 10;
async function getSellProducts(siteId: string): Promise<Data> {
  // Fetch data from your API here.
  // Fetch all the products

  const supabase = await createClient();
  const { data: qualityControl, error: qualityControlError } = await supabase
    .from("quality_control")
    .select(
      `
    *,
    items:items(*),
    task:task(*),
    user:user(*)
  `
    )
    .eq("site_id", siteId)
    .eq("task.archived", false)
    .eq("task.column.identifier", "SPEDITO")
    .order("task.unique_code", { ascending: true });

  if (qualityControlError) {
    console.error("Error fetching quality control:", qualityControlError);
    return { quality: [] };
  }

  return { quality: qualityControl };
}

async function Page({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  const session = await getUserContext();
  const returnLink = `/api/auth/login?returnTo=${encodeURIComponent(
    "/qualityControl/edit"
  )}`;
  if (!session || !session.user) {
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
  const { user } = session;

  return <MobilePage data={data} session={user} />;
}

export default Page;
