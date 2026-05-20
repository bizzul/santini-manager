import React from "react";
import { redirect } from "next/navigation";

import { getUserContext } from "@/lib/auth-utils";
import { createServiceClient } from "@/utils/supabase/server";
import MobilePage from "@/components/errorTracking/mobilePage";
import { requireServerSiteContext } from "@/lib/server-data";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";

async function getData(siteId: string): Promise<any> {
  const supabase = createServiceClient();
  const { data: tasks } = await supabase
    .from("Task")
    .select(
      "id, unique_code, title, Client(businessName, individualFirstName, individualLastName)"
    )
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });
  const { data: roles } = await supabase
    .from("Roles")
    .select("*")
    .or(`site_id.eq.${siteId},site_id.is.null`);
  const { data: suppliers } = await supabase
    .from("Supplier")
    .select("*, supplier_category:Product_category(name)")
    .eq("site_id", siteId);
  const { data: categories } = await supabase
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
    return redirect("/login");
  }

  const siteContext = await requireServerSiteContext(domain);
  const { siteId } = siteContext;

  const data = await getData(siteId);

  return (
    <PageLayout>
      <PageHeader
        title="Segnalazione errori"
        subtitle="Compila il form per segnalare un errore"
      />
      <PageContent variant="narrow">
        <MobilePage data={data} session={userContext} />
      </PageContent>
    </PageLayout>
  );
}

export default Page;
