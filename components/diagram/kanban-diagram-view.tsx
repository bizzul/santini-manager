"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import AreaTreeDiagram from "@/components/diagram/AreaTreeDiagram";
import { useDiagramFocus } from "@/components/diagram/use-diagram-focus";
import type { AreaTreeSector } from "@/lib/area-tree-diagram";

export interface KanbanDiagramColumn {
  id: number;
  title: string;
  taskCount: number;
}

export interface KanbanDiagramBoard {
  id: number;
  title: string | null;
  identifier: string | null;
  categoryId: string;
  categoryName: string;
  categoryIdentifier: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  displayOrder: number;
  columns: KanbanDiagramColumn[];
}

interface KanbanDiagramViewProps {
  boards: KanbanDiagramBoard[];
  domain: string;
  siteId?: string;
}

export function KanbanDiagramView({
  boards,
  domain,
  siteId,
}: KanbanDiagramViewProps) {
  const router = useRouter();
  const { buildHref } = useDiagramFocus();

  const sectors: AreaTreeSector[] = useMemo(() => {
    const groups = new Map<
      string,
      {
        id: string;
        name: string;
        color: string | null;
        icon: string | null;
        displayOrder: number;
        boards: KanbanDiagramBoard[];
      }
    >();

    for (const board of boards) {
      const group = groups.get(board.categoryId) ?? {
        id: board.categoryId,
        name: board.categoryName,
        color: board.categoryColor,
        icon: board.categoryIcon,
        displayOrder: board.displayOrder,
        boards: [],
      };
      group.boards.push(board);
      groups.set(board.categoryId, group);
    }

    return Array.from(groups.values())
      .sort(
        (a, b) =>
          a.displayOrder - b.displayOrder ||
          a.name.localeCompare(b.name, "it"),
      )
      .map((category) => ({
        id: category.id,
        label: category.name,
        badge: String(category.boards.length),
        color: category.color ?? undefined,
        icon: category.icon ?? undefined,
        panels: category.boards.map((board) => ({
          id: String(board.id),
          title: board.title || "Kanban",
          rows: (board.columns ?? []).map((column) => ({
            id: `col-${board.id}-${column.id}`,
            label: column.title,
            badge: String(column.taskCount),
            onClick: () => {
              if (!board.identifier) return;
              const params: Record<string, string | null> = {
                view: null,
                focus: null,
                name: board.identifier,
              };
              if (board.categoryIdentifier) {
                params.category = board.categoryIdentifier;
              }
              router.push(buildHref(params));
            },
          })),
        })),
      }));
  }, [boards, buildHref, router]);

  const root = {
    label: "Kanban",
    sublabel: `${boards.length} bacheche`,
    icon: "faTable",
  };

  return (
    <AreaTreeDiagram
      root={root}
      sectors={sectors}
      siteId={siteId}
      diagramKey="kanban"
    />
  );
}
