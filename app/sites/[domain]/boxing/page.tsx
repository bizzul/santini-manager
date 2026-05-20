import React from "react";
import { redirect } from "next/navigation";
import { PackageCheck } from "lucide-react";

import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { createClient } from "@/utils/supabase/server";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { EmptyState } from "@/components/layout/empty-state";
import SellProductWrapper from "./sellProductWrapper";

async function getPackingControl(siteId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("PackingControl")
    .select(`
      *,
      task:taskId(unique_code, title, Client:clientId(businessName, individualFirstName, individualLastName)),
      user:userId(id, given_name, family_name)
    `)
    .eq("site_id", siteId);

  if (error) {
    return [];
  }

  return data || [];
}

export default async function Page({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  const userContext = await getUserContext();
  if (!userContext?.user) {
    return redirect("/login");
  }

  const { siteId } = await requireServerSiteContext(domain);
  const data = await getPackingControl(siteId);

  return (
    <PageLayout>
      <PageHeader
        title="Packing control"
        subtitle="Verifica e tracciamento degli imballaggi"
      />
      <PageContent>
        {data.length > 0 ? (
          <SellProductWrapper data={data} />
        ) : (
          <EmptyState
            icon={<PackageCheck className="h-6 w-6" />}
            title="Nessun packing control creato"
            description="I controlli di imballaggio creati dalle commesse compariranno qui."
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
