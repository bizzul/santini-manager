import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchSuppliers,
  fetchSupplierCategories,
  fetchSiteVerticalProfile,
  fetchSupplierRowInsights,
} from "@/lib/server-data";
import DialogCreate from "./dialogCreate";
import DialogImportCSV from "./dialogImportCSV";
import ButtonExportCSV from "./buttonExportCSV";
import DataWrapper from "./dataWrapper";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { EmptyState } from "@/components/layout/empty-state";
import { Truck } from "lucide-react";

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

  // Fetch data in parallel
  const [suppliers, categories, rowInsights] = await Promise.all([
    fetchSuppliers(siteId),
    fetchSupplierCategories(siteId),
    fetchSupplierRowInsights(siteId),
  ]);

  return (
    <PageLayout>
      <PageHeader
        title={verticalProfile.pageCopy.suppliersTitle}
        subtitle={verticalProfile.pageCopy.suppliersSubtitle}
        actions={
          <>
            <ButtonExportCSV />
            <DialogImportCSV />
            <DialogCreate data={categories} domain={domain} />
          </>
        }
      />
      <PageContent>
        {suppliers.length > 0 ? (
          <DataWrapper data={suppliers} domain={domain} rowInsights={rowInsights} />
        ) : (
          <EmptyState
            icon={<Truck className="h-6 w-6" />}
            title="Nessun fornitore registrato"
            description="Premi 'Aggiungi fornitore' per aggiungere il tuo primo fornitore."
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
