import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchCollaborators,
} from "@/lib/server-data";
import DataWrapper from "./dataWrapper";
import { checkIsAdmin } from "./actions";
import { AddCollaboratorDialog } from "./add-collaborator-dialog";
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

  // Check if user is admin for this site
  const isAdmin = await checkIsAdmin(siteId);

  // Fetch collaborators
  const collaborators = await fetchCollaborators(siteId);

  return (
    <PageLayout>
      <PageHeader>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Collaboratori</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Gestisci i collaboratori collegati a questo sito"
              : "Visualizza i collaboratori collegati a questo sito"}
          </p>
        </div>
      </PageHeader>
      <PageContent>
        {collaborators.length > 0 ? (
          <DataWrapper
            data={collaborators}
            domain={domain}
            siteId={siteId}
            isAdmin={isAdmin}
          />
        ) : (
          <div className="w-full h-80 text-center flex flex-col justify-center items-center gap-4">
            <h2 className="font-bold text-xl">Nessun collaboratore trovato</h2>
            <p className="text-muted-foreground">
              Non ci sono collaboratori collegati a questo sito.
            </p>
            {isAdmin && (
              <AddCollaboratorDialog siteId={siteId} domain={domain} />
            )}
          </div>
        )}
      </PageContent>
    </PageLayout>
  );
}
