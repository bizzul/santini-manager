"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import FocusDiagram from "@/components/diagram/FocusDiagram";
import type { Collaborator } from "@/app/sites/[domain]/collaborators/columns";

interface CollaboratorsDiagramViewProps {
  collaborators: Collaborator[];
  domain: string;
  siteId?: string;
}

function getInitials(label: string): string {
  return (
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function CollaboratorsDiagramView({
  collaborators,
  domain,
  siteId,
}: CollaboratorsDiagramViewProps) {
  const router = useRouter();

  const root = {
    label: "Collaboratori",
    sublabel: `${collaborators.length} utenti`,
    icon: "faUserTie",
  };

  const children = useMemo(
    () =>
      collaborators.map((collaborator) => {
        const fullName =
          [collaborator.given_name, collaborator.family_name]
            .filter(Boolean)
            .join(" ") ||
          collaborator.email ||
          "Utente";
        return {
          id: String(collaborator.id),
          label: fullName,
          avatar: {
            initials: collaborator.initials || getInitials(fullName),
            imageUrl: collaborator.picture,
            color: collaborator.color,
          },
          onClick: () => {
            if (collaborator.is_virtual_agent) return;
            router.push(`/sites/${domain}/collaborators/${collaborator.id}`);
          },
        };
      }),
    [collaborators, domain, router],
  );

  return (
    <FocusDiagram
      root={root}
      items={children}
      siteId={siteId}
      diagramKey="collaborators"
    />
  );
}
