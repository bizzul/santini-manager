import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchSupplierCategories,
} from "@/lib/server-data";
import DialogCreate from "./dialogCreate";
import DataWrapper from "./dataWrapper";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { EmptyState } from "@/components/layout/empty-state";
import { Tags } from "lucide-react";

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
  const categories = await fetchSupplierCategories(siteId);

  return (
    <PageLayout>
      <PageHeader
        title="Categorie Fornitori"
        actions={<DialogCreate domain={domain} />}
      />
      <PageContent>
        {categories.length > 0 ? (
          <DataWrapper data={categories} domain={domain} />
        ) : (
          <EmptyState
            icon={<Tags className="h-6 w-6" />}
            title="Nessuna categoria fornitore registrata"
            description="Premi 'Aggiungi categoria' per aggiungere la tua prima categoria."
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
