"use client";

import React from "react";
import { DataTable } from "./table";
import { Collaborator } from "./columns";
import { ASSISTANT_REGISTRY } from "@/assistants/hub/AssistantRegistry";
import type { AssistantCollaboratorProfileRecord } from "./actions";
import { DiagramViewToolbar } from "@/components/diagram/diagram-view-toolbar";
import { CollaboratorsDiagramView } from "@/components/diagram/collaborators-diagram-view";
import { useDiagramFocus } from "@/components/diagram/use-diagram-focus";
import { cn } from "@/lib/utils";

interface CollaboratorsPageClientProps {
  data: Collaborator[];
  domain: string;
  siteId: string;
  isAdmin: boolean;
  currentUserRole?: string;
  agentProfiles?: Partial<
    Record<"vera" | "mira" | "aura", AssistantCollaboratorProfileRecord>
  >;
}

export function CollaboratorsPageClient({
  data,
  domain,
  siteId,
  isAdmin,
  currentUserRole,
  agentProfiles,
}: CollaboratorsPageClientProps) {
  const { isDiagram, setView } = useDiagramFocus();

  const virtualAgents: Collaborator[] = Object.values(ASSISTANT_REGISTRY).map(
    (assistant, index) => {
      const profileOverride = agentProfiles?.[assistant.id];
      const displayName =
        profileOverride?.displayName || assistant.displayName;
      const [firstWord, ...otherWords] = displayName.split(" ").filter(Boolean);
      return {
        id: -(index + 1),
        authId: null,
        email: `${assistant.id}.agent@manager.local`,
        given_name: firstWord || displayName,
        family_name: otherWords.join(" ") || null,
        initials:
          profileOverride?.initials ||
          displayName.slice(0, 2).toUpperCase(),
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
    },
  );

  const mergedData: Collaborator[] = [...data, ...virtualAgents];

  return (
    <div
      className={cn(
        "w-full",
        isDiagram ? "flex h-full min-h-0 flex-col gap-4" : "space-y-4",
      )}
    >
      <DiagramViewToolbar
        domain={domain}
        value={isDiagram ? "diagram" : "table"}
        onChange={(mode) => setView(mode === "diagram" ? "diagram" : "table")}
      />

      {isDiagram ? (
        <div className="min-h-0 flex-1">
          <CollaboratorsDiagramView
            collaborators={mergedData}
            domain={domain}
            siteId={siteId}
          />
        </div>
      ) : (
        <DataTable
          data={mergedData}
          domain={domain}
          siteId={siteId}
          isAdmin={isAdmin}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  );
}
