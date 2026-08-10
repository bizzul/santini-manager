import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { isAdminOrSuperadmin } from "@/lib/permissions";
import { requireServerSiteContext } from "@/lib/server-data";
import { createClient } from "@/utils/server";
import { PageLayout } from "@/components/page-layout";
import type { ListinoCoefficiente } from "@/types/supabase";
import { CoefficientiPageClient } from "./coefficienti-page-client";

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
    .from("listino_coefficienti")
    .select("*")
    .eq("site_id", siteId)
    .order("categoria", { ascending: true })
    .order("codice", { ascending: true });

  if (error) {
    console.error("Error fetching coefficienti:", error);
  }

  const coefficienti = (data ?? []) as ListinoCoefficiente[];

  return (
    <PageLayout>
      <CoefficientiPageClient
        coefficienti={coefficienti}
        domain={domain}
        siteId={siteId}
        isAdmin={isAdmin}
      />
    </PageLayout>
  );
}
