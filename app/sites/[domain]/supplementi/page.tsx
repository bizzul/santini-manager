import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { isAdminOrSuperadmin } from "@/lib/permissions";
import { requireServerSiteContext } from "@/lib/server-data";
import { createClient } from "@/utils/server";
import { PageLayout } from "@/components/page-layout";
import type { Supplemento, SupplementoCategoria } from "@/types/supabase";
import { SupplementiPageClient } from "./supplementi-page-client";

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
  const isAdmin = isAdminOrSuperadmin(userContext.role);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supplementi")
    .select("*, supplementi_categorie(categoria)")
    .eq("site_id", siteId)
    .order("codice", { ascending: true });

  if (error) {
    console.error("Error fetching supplementi:", error);
  }

  const supplementi: Supplemento[] = (data ?? []).map((row: any) => {
    const { supplementi_categorie, ...rest } = row;
    return {
      ...rest,
      categorie: (supplementi_categorie ?? []).map(
        (c: { categoria: SupplementoCategoria }) => c.categoria,
      ),
    };
  });

  return (
    <PageLayout>
      <SupplementiPageClient
        supplementi={supplementi}
        domain={domain}
        siteId={siteId}
        isAdmin={isAdmin}
      />
    </PageLayout>
  );
}
