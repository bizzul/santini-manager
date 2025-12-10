import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchSuppliers,
  fetchSupplierCategories,
} from "@/lib/server-data";
import DialogCreate from "./dialogCreate";
import DialogImportCSV from "./dialogImportCSV";
import ButtonExportCSV from "./buttonExportCSV";
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

  // Fetch data in parallel
  const [suppliers, categories] = await Promise.all([
    fetchSuppliers(siteId),
    fetchSupplierCategories(siteId),
  ]);

  return (
    <PageLayout>
      <PageHeader>
        <h1 className="text-2xl font-bold">Fornitori</h1>
        <div className="flex gap-2">
          <ButtonExportCSV />
          <DialogImportCSV />
          <DialogCreate data={categories} domain={domain} />
        </div>
      </PageHeader>
      <PageContent>
        {suppliers.length > 0 ? (
          <DataWrapper data={suppliers} domain={domain} />
        ) : (
          <div className="w-full text-center flex flex-col justify-center items-center h-80">
            <h1 className="font-bold text-2xl">Nessun fornitore registrato!</h1>
            <p>
              Premi (Aggiungi fornitore) per aggiungere il tuo primo fornitore!
            </p>
          </div>
        )}
      </PageContent>
    </PageLayout>
  );
}
