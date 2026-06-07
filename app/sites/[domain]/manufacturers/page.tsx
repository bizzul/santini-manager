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
import { EmptyState } from "@/components/layout/empty-state";
import { Factory } from "lucide-react";

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
      <PageHeader
        title="Produttori"
        actions={
          <>
            <ButtonExportCSV />
            <DialogImportCSV />
            <DialogCreate data={categories} domain={domain} />
          </>
        }
      />
      <PageContent>
        {manufacturers.length > 0 ? (
          <DataWrapper data={manufacturers} domain={domain} />
        ) : (
          <EmptyState
            icon={<Factory className="h-6 w-6" />}
            title="Nessun produttore registrato"
            description="Premi 'Aggiungi produttore' per aggiungere il tuo primo produttore."
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
