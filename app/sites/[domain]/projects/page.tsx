import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchProjectsData,
  fetchSiteVerticalProfile,
} from "@/lib/server-data";
import { ProjectsHeader } from "./ProjectsHeader";
import SellProductWrapper from "./sellProductWrapper";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { EmptyState } from "@/components/layout/empty-state";
import { FolderKanban } from "lucide-react";
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
  searchParams,
}: {
  params: Promise<{ domain: string }>;
  searchParams?: Promise<{ country?: string }>;
}) {
  const { domain } = await params;
  const { country } = (await searchParams) ?? {};

  // Authentication
  const userContext = await getUserContext();
  if (!userContext?.user?.id) {
    return redirect("/login");
  }

  // Get site context (required)
  const { siteId } = await requireServerSiteContext(domain);
  const verticalProfile = await fetchSiteVerticalProfile(siteId);

  // Fetch all project data
  const rawData = await fetchProjectsData(siteId);

  // Optional country filter (dashboard map / integration graph shortcuts):
  // keep only tasks whose client is located in the given country.
  const data = country
    ? (() => {
        const iso2 = country.toUpperCase();
        const clientIdsInCountry = new Set(
          (rawData.clients as Array<{ id: number; countryCode?: string | null }>)
            .filter((c) => String(c.countryCode || "").toUpperCase() === iso2)
            .map((c) => c.id),
        );
        return {
          ...rawData,
          tasks: rawData.tasks.filter((task: { clientId?: number | null }) =>
            task.clientId ? clientIdsInCountry.has(task.clientId) : false,
          ),
        };
      })()
    : rawData;

  return (
    <PageLayout>
      <PageHeader
        title={verticalProfile.pageCopy.projectsTitle}
        subtitle={verticalProfile.pageCopy.projectsSubtitle}
        actions={<ProjectsHeader data={data} domain={domain} siteId={siteId} />}
      />
      <PageContent>
        {data.tasks?.length > 0 ? (
          <SellProductWrapper data={data} domain={domain} siteId={siteId} />
        ) : (
          <EmptyState
            icon={<FolderKanban className="h-6 w-6" />}
            title="Nessun progetto registrato"
            description="Premi 'Aggiungi progetto' per aggiungere il tuo primo progetto."
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
