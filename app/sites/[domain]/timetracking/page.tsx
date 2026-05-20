import React from "react";
import { redirect } from "next/navigation";

import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchTimetrackingData,
} from "@/lib/server-data";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
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
  const data = await fetchTimetrackingData(siteId);

  const metadataRoleRaw = userContext.user?.app_metadata?.role;
  const metadataRole =
    typeof metadataRoleRaw === "string"
      ? metadataRoleRaw.toLowerCase()
      : undefined;
  const effectiveRole =
    userContext.role === "user" &&
    (metadataRole === "admin" || metadataRole === "superadmin")
      ? metadataRole
      : userContext.role;
  const isRegularUser = effectiveRole === "user";
  const currentUserRecord = data.users.find(
    (u: any) => u.authId === userContext.user.id
  );
  const filteredTimetrackings = isRegularUser
    ? data.timetrackings.filter(
        (entry: any) => entry.employee_id === currentUserRecord?.id
      )
    : data.timetrackings;

  return (
    <PageLayout>
      <PageHeader
        title={isRegularUser ? "Le mie ore" : "Ore lavorate"}
        subtitle={
          isRegularUser
            ? "Registra e consulta le tue ore lavorate"
            : "Consultazione e gestione delle ore del team"
        }
      />
      <PageContent>
        <DataWrapper
          data={filteredTimetrackings}
          users={data.users}
          roles={data.roles}
          tasks={data.tasks}
          domain={domain}
          internalActivities={data.internalActivities}
          mode={isRegularUser ? "personal" : "admin"}
          currentUserId={userContext.user.id}
        />
      </PageContent>
    </PageLayout>
  );
}
