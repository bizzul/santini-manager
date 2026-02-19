import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchTimetrackingData,
} from "@/lib/server-data";
import DialogCreate from "./dialogCreate";
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
  // Regular users can only see their own entries
  const isRegularUser = userContext.role === "user";
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
      <DialogCreate
        data={data.tasks}
        users={data.users}
        roles={data.roles}
        internalActivities={data.internalActivities}
      />
      {filteredTimetrackings.length > 0 ? (
        <DataWrapper
          data={filteredTimetrackings}
          users={data.users}
          roles={data.roles}
          tasks={data.tasks}
        />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">
            Nessun rapporto ore registrato!
          </h1>
          <p>Premi (Aggiungi rapporto) per aggiungere il tuo primo rapporto!</p>
        </div>
      )}
    </div>
  );
}
