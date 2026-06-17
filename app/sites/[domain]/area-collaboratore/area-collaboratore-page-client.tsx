"use client";

import React from "react";
import { CollaboratorArea } from "@/components/collaborator/CollaboratorArea";
import type { WeeklyCalendarItem } from "@/components/calendar/weekly-calendar-types";
import type { AssignedTaskOption, CollaboratorRoleOption } from "./page";

interface AreaCollaboratorePageClientProps {
  domain: string;
  siteId: string;
  displayName: string;
  userAuthId: string;
  hasProfile: boolean;
  calendarItems: WeeklyCalendarItem[];
  assignedTasks: AssignedTaskOption[];
  roles: CollaboratorRoleOption[];
}

export function AreaCollaboratorePageClient({
  domain,
  siteId,
  displayName,
  userAuthId,
  hasProfile,
  calendarItems,
  assignedTasks,
  roles,
}: AreaCollaboratorePageClientProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Ciao <span className="font-semibold text-foreground">{displayName}</span>
        , qui trovi i progetti pianificati per te e puoi registrare le ore
        lavorate.
      </p>
      <CollaboratorArea
        domain={domain}
        siteId={siteId}
        userAuthId={userAuthId}
        hasProfile={hasProfile}
        calendarItems={calendarItems}
        assignedTasks={assignedTasks}
        roles={roles}
      />
    </div>
  );
}
