import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext, fetchSellProducts } from "@/lib/server-data";
import DialogCreate from "./dialogCreate";
import DialogImportCSV from "./dialogImportCSV";
import ButtonExportCSV from "./buttonExportCSV";
import SellProductWrapper from "./sellProductWrapper";
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

  // Fetch data
  const products = await fetchSellProducts(siteId);

  return (
    <PageLayout>
      <PageHeader>
        <h1 className="text-2xl font-bold">Prodotti</h1>
        <div className="flex gap-2">
          <ButtonExportCSV />
          <DialogImportCSV />
          <DialogCreate domain={domain} siteId={siteId} />
        </div>
      </PageHeader>
      <PageContent>
        {products.length > 0 ? (
          <SellProductWrapper data={products} domain={domain} siteId={siteId} />
        ) : (
          <div className="w-full text-center flex flex-col justify-center items-center h-80">
            <h1 className="font-bold text-2xl">Nessun prodotto registrato!</h1>
            <p>
              Premi (Aggiungi prodotto) per aggiungere il tuo primo prodotto!
            </p>
          </div>
        )}
      </PageContent>
    </PageLayout>
  );
}
