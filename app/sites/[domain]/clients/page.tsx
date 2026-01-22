import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext, fetchClients } from "@/lib/server-data";
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
  if (!userContext) {
    return redirect("/login");
  }

  // Get site context (required)
  const { siteId } = await requireServerSiteContext(domain);

  // Fetch data
  const clients = await fetchClients(siteId);

  return (
    <PageLayout>
      <PageHeader>
        <h1 className="text-2xl font-bold">Clienti</h1>
        <div className="flex gap-2">
          <ButtonExportCSV />
          <DialogImportCSV />
          <DialogCreate />
        </div>
      </PageHeader>
      <PageContent>
        {clients.length > 0 ? (
          <DataWrapper data={clients} domain={domain} />
        ) : (
          <div className="w-full text-center flex flex-col justify-center items-center h-80">
            <h1 className="font-bold text-2xl">Nessun cliente registrato</h1>
            <p>Premi (Aggiungi cliente) per aggiungere il tuo primo cliente!</p>
          </div>
        )}
      </PageContent>
    </PageLayout>
  );
}
