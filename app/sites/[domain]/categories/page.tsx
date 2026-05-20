import React from "react";
import { redirect } from "next/navigation";
import { Folder } from "lucide-react";

import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext, fetchCategories } from "@/lib/server-data";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { EmptyState } from "@/components/layout/empty-state";
import DialogCreate from "./dialogCreate";
import DataWrapper from "./dataWrapper";

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
  const categories = await fetchCategories(siteId);

  return (
    <PageLayout>
      <PageHeader
        title="Categorie"
        subtitle="Organizza le categorie utilizzate nelle commesse"
        actions={<DialogCreate domain={domain} />}
      />
      <PageContent>
        {categories.length > 0 ? (
          <DataWrapper data={categories} domain={domain} />
        ) : (
          <EmptyState
            icon={<Folder className="h-6 w-6" />}
            title="Nessuna categoria registrata"
            description="Premi 'Aggiungi categoria' per creare la prima categoria."
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
