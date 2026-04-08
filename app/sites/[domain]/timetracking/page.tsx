import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchTimetrackingData,
} from "@/lib/server-data";
import DataWrapper from "./dataWrapper";

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

  // Fetch timetracking data
  const data = await fetchTimetrackingData(siteId);

  // Filter timetracking entries based on user role
  // Prefer DB role, but fall back to auth app_metadata role for superadmin/admin users
  // that might not be aligned yet in the User table.
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
  // userContext.user.id is the auth UUID, but employee_id references User.id (integer)
  // We need to find the current user's User table record to get the integer ID
  const currentUserRecord = data.users.find(
    (u: any) => u.authId === userContext.user.id
  );
  const filteredTimetrackings = isRegularUser
    ? data.timetrackings.filter(
        (entry: any) => entry.employee_id === currentUserRecord?.id
      )
    : data.timetrackings;

  return (
    <div className="container">
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
    </div>
  );
}
