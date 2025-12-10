import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchManufacturers,
  fetchManufacturerCategories,
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
  const [manufacturers, categories] = await Promise.all([
    fetchManufacturers(siteId),
    fetchManufacturerCategories(siteId),
  ]);

  return (
    <PageLayout>
      <PageHeader>
        <h1 className="text-2xl font-bold">Produttori</h1>
        <div className="flex gap-2">
          <ButtonExportCSV />
          <DialogImportCSV />
          <DialogCreate data={categories} domain={domain} />
        </div>
      </PageHeader>
      <PageContent>
        {manufacturers.length > 0 ? (
          <DataWrapper data={manufacturers} domain={domain} />
        ) : (
          <div className="w-full text-center flex flex-col justify-center items-center h-80">
            <h1 className="font-bold text-2xl">
              Nessun produttore registrato!
            </h1>
            <p>
              Premi (Aggiungi produttore) per aggiungere il tuo primo
              produttore!
            </p>
          </div>
        )}
      </PageContent>
    </PageLayout>
  );
}
