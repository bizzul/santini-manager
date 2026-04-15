"use client";

import React from "react";
import { DataTable } from "./table";
import { Collaborator } from "./columns";
import { ASSISTANT_REGISTRY } from "@/assistants/hub/AssistantRegistry";
import type { AssistantCollaboratorProfileRecord } from "./actions";

interface DataWrapperProps {
  data: Collaborator[];
  domain: string;
  siteId: string;
  isAdmin: boolean;
  currentUserRole?: string;
  agentProfiles?: Partial<
    Record<"vera" | "mira" | "aura", AssistantCollaboratorProfileRecord>
  >;
}

const DataWrapper = ({
  data,
  domain,
  siteId,
  isAdmin,
  currentUserRole,
  agentProfiles,
}: DataWrapperProps) => {
  const virtualAgents: Collaborator[] = Object.values(ASSISTANT_REGISTRY).map(
    (assistant, index) => {
      const profileOverride = agentProfiles?.[assistant.id];
      const displayName = profileOverride?.displayName || assistant.displayName;
      const [firstWord, ...otherWords] = displayName.split(" ").filter(Boolean);
      return {
        id: -(index + 1),
        authId: null,
        email: `${assistant.id}.agent@manager.local`,
        given_name: firstWord || displayName,
        family_name: otherWords.join(" ") || null,
        initials: profileOverride?.initials || displayName.slice(0, 2).toUpperCase(),
        picture:
          profileOverride?.picture ||
          `/api/assistant/avatar?assistant=${assistant.id}&variant=launcher`,
        color:
          profileOverride?.color ||
          (assistant.id === "vera"
            ? "#4f46e5"
            : assistant.id === "mira"
            ? "#0ea5e9"
            : "#f43f5e"),
        role: "agent",
        company_role: profileOverride?.roleSummary || assistant.roleSummary,
        site_role: "agent",
        is_org_admin: false,
        enabled: profileOverride?.enabled ?? true,
        joined_site_at: null,
        assigned_roles: [],
        is_virtual_agent: true,
        assistant_id: assistant.id,
      };
    }
  );

  const mergedData: Collaborator[] = [...data, ...virtualAgents];

  return (
    <div className="w-full">
      <DataTable
        data={mergedData}
        domain={domain}
        siteId={siteId}
        isAdmin={isAdmin}
        currentUserRole={currentUserRole}
      />
    </div>
  );
};

export default DataWrapper;
