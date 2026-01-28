import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext, fetchProjectsData } from "@/lib/server-data";
import { ProjectsHeader } from "./ProjectsHeader";
import SellProductWrapper from "./sellProductWrapper";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { Client, SellProduct, Kanban, SellProductCategory } from "@/types/supabase";

// Type for data returned by fetchProjectsData
export type Data = {
  clients: Client[];
  activeProducts: SellProduct[];
  kanbans: Kanban[];
  tasks: Awaited<ReturnType<typeof fetchProjectsData>>["tasks"];
  categories: SellProductCategory[];
};

export default async function Page({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  // Authentication
  const userContext = await getUserContext();
  if (!userContext?.user?.id) {
    return redirect("/login");
  }

  // Get site context (required)
  const { siteId } = await requireServerSiteContext(domain);

  // Fetch all project data
  const data = await fetchProjectsData(siteId);

  return (
    <PageLayout>
      <PageHeader>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Gestione Progetti</h1>
          <p className="text-sm text-muted-foreground">
            Gestione operativa progetti, stato avanzamento e documentazione
          </p>
        </div>
        <ProjectsHeader data={data} domain={domain} siteId={siteId} />
      </PageHeader>
      <PageContent>
        {data.tasks?.length > 0 ? (
          <SellProductWrapper data={data} domain={domain} />
        ) : (
          <div className="w-full text-center flex flex-col justify-center items-center h-80">
            <h1 className="font-bold text-2xl">Nessun progetto registrato!</h1>
            <p>Premi (Aggiungi progetto) per aggiungere il tuo primo progetto!</p>
          </div>
        )}
      </PageContent>
    </PageLayout>
  );
}
