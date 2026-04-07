import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchInventoryData,
  fetchSiteVerticalProfile,
} from "@/lib/server-data";
import DialogCreate from "./dialogCreate";
import DataWrapper from "./dataWrapper";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";

export default async function Page({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  // Authentication
  const userContext = await getUserContext();
  if (!userContext?.user) {
    return redirect("/login");
  }

  // Get site context (required)
  const { siteId } = await requireServerSiteContext(domain);
  const verticalProfile = await fetchSiteVerticalProfile(siteId);

  // Fetch inventory data
  const data = await fetchInventoryData(siteId);

  return (
    <PageLayout>
      <PageHeader>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">{verticalProfile.pageCopy.inventoryPageTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {verticalProfile.pageCopy.inventoryPageSubtitle}
          </p>
        </div>
        <DialogCreate data={data} />
      </PageHeader>
      <PageContent>
        {data.inventory.length > 0 ? (
          <DataWrapper data={data.inventory} categories={data.categories} />
        ) : (
          <div className="w-full h-full text-center">
            <h1 className="font-bold text-2xl">Nessun prodotto registrato!</h1>
            <p>Premi (Aggiungi prodotto) per aggiungere il tuo primo prodotto!</p>
          </div>
        )}
      </PageContent>
    </PageLayout>
  );
}
