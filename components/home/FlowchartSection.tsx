"use client";

import { Hourglass, Workflow } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import WbsDiagram from "@/components/home/WbsDiagram";
import {
  FLOWCHART_TYPE_LABELS,
  type FlowchartNodeStyle,
  type FlowchartType,
} from "@/lib/flowchart-settings";
import type { WbsTree } from "@/lib/wbs-data";

export interface FlowchartSectionProps {
  type: FlowchartType;
  domain: string;
  /** WBS tree built server-side; required for the `wbs` type. */
  tree?: WbsTree;
  nodeStyle?: FlowchartNodeStyle;
}

/**
 * Dispatcher for the home diagram view: renders the diagram matching the
 * configured type. Venn and Gantt are selectable in the admin panel but not
 * implemented yet, so they show a "coming soon" placeholder.
 */
export default function FlowchartSection({
  type,
  domain,
  tree,
  nodeStyle,
}: FlowchartSectionProps) {
  if (type === "wbs" && tree) {
    if (tree.categories.length === 0) {
      return (
        <div className="flex h-full min-h-[480px] items-center justify-center rounded-lg border bg-card">
          <EmptyState
            icon={<Workflow className="h-6 w-6" />}
            title="Nessun modulo da visualizzare"
            description="Non ci sono moduli da collegare al nodo centrale: verifica i moduli selezionati nella Vista Diagramma del pannello di amministrazione o i permessi dell'utente."
            className="border-none bg-transparent"
          />
        </div>
      );
    }
    return <WbsDiagram tree={tree} domain={domain} nodeStyle={nodeStyle} />;
  }

  return (
    <div className="flex h-full min-h-[480px] items-center justify-center rounded-lg border bg-card">
      <EmptyState
        icon={<Hourglass className="h-6 w-6" />}
        title={`${FLOWCHART_TYPE_LABELS[type]} — In arrivo`}
        description="Questo tipo di diagramma è in fase di sviluppo. Nel frattempo puoi selezionare il Diagramma WBS dal pannello di amministrazione o usare la vista standard."
        className="border-none bg-transparent"
      />
    </div>
  );
}
