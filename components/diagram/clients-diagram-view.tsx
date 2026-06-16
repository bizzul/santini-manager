"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import FocusDiagram from "@/components/diagram/FocusDiagram";
import { useDiagramFocus } from "@/components/diagram/use-diagram-focus";
import { parseFocusPath } from "@/lib/diagram-focus";

interface ClientsDiagramViewProps {
  clients: Array<{ id: number; clientType?: string | null }>;
  domain: string;
  siteId?: string;
}

export function ClientsDiagramView({
  clients,
  domain,
  siteId,
}: ClientsDiagramViewProps) {
  const router = useRouter();
  const { focusPath, pushFocus, buildHref } = useDiagramFocus();

  const typeSegment = parseFocusPath(focusPath).find(
    (segment) => segment.type === "type",
  );

  const individuals = clients.filter(
    (client) => client.clientType === "INDIVIDUAL",
  ).length;
  const businesses = clients.length - individuals;

  const root = typeSegment
    ? {
        label: typeSegment.value === "individual" ? "Privati" : "Aziende",
        sublabel: "Clienti",
        icon: "faUser",
      }
    : {
        label: "Clienti",
        sublabel: `${clients.length} clienti`,
        icon: "faUser",
      };

  const children = useMemo(() => {
    if (typeSegment) {
      const filtered = clients.filter((client) =>
        typeSegment.value === "individual"
          ? client.clientType === "INDIVIDUAL"
          : client.clientType !== "INDIVIDUAL",
      );

      return filtered.map((client) => {
        const record = client as {
          id: number;
          businessName?: string | null;
          individualFirstName?: string | null;
          individualLastName?: string | null;
        };
        const label =
          record.businessName ||
          [record.individualFirstName, record.individualLastName]
            .filter(Boolean)
            .join(" ") ||
          `Cliente ${record.id}`;

        return {
          id: String(record.id),
          label,
          onClick: () => {
            router.push(
              buildHref({
                view: null,
                focus: null,
                edit: String(record.id),
              }),
            );
          },
        };
      });
    }

    const nodes = [];
    if (individuals > 0) {
      nodes.push({
        id: "individual",
        label: "Privati",
        badge: String(individuals),
        icon: "CircleUser",
        hasChildren: true,
        onClick: () => pushFocus({ type: "type", value: "individual" }),
      });
    }
    if (businesses > 0) {
      nodes.push({
        id: "business",
        label: "Aziende",
        badge: String(businesses),
        icon: "Factory",
        hasChildren: true,
        onClick: () => pushFocus({ type: "type", value: "business" }),
      });
    }
    return nodes;
  }, [
    businesses,
    buildHref,
    clients,
    individuals,
    pushFocus,
    router,
    typeSegment,
  ]);

  return (
    <FocusDiagram
      root={root}
      items={children}
      siteId={siteId}
      diagramKey="clients"
    />
  );
}

export function filterClientsByFocus<T extends { clientType?: string | null }>(
  clients: T[],
  focusPath: string | null | undefined,
): T[] | null {
  const typeSegment = parseFocusPath(focusPath).find(
    (segment) => segment.type === "type",
  );
  if (!typeSegment) return null;

  return clients.filter((client) =>
    typeSegment.value === "individual"
      ? client.clientType === "INDIVIDUAL"
      : client.clientType !== "INDIVIDUAL",
  );
}
