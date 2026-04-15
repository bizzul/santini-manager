import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchCollaborators,
} from "@/lib/server-data";
import DataWrapper from "./dataWrapper";
import { checkIsAdmin, getAssistantCollaboratorProfiles } from "./actions";
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

  // Get current user's role for permission checks
  const currentUserRole = userContext.role;

  // Fetch collaborators
  const collaborators = await fetchCollaborators(siteId);
  const assistantProfiles = await getAssistantCollaboratorProfiles(siteId);

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
        <DataWrapper
          data={collaborators}
          domain={domain}
          siteId={siteId}
          isAdmin={isAdmin}
          currentUserRole={currentUserRole}
          agentProfiles={assistantProfiles}
        />
      </PageContent>
    </PageLayout>
  );
}
