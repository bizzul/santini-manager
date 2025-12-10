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
      <PageHeader>
        <h1 className="text-2xl font-bold">Categorie Fornitori</h1>
        <DialogCreate domain={domain} />
      </PageHeader>
      <PageContent>
        {categories.length > 0 ? (
          <DataWrapper data={categories} domain={domain} />
        ) : (
          <div className="w-full h-full text-center flex flex-col justify-center items-center h-80">
            <h1 className="font-bold text-2xl">
              Nessuna categoria fornitore registrata!
            </h1>
            <p>
              Premi (Aggiungi categoria) per aggiungere la tua prima categoria
            </p>
          </div>
        )}
      </PageContent>
    </PageLayout>
  );
}
