"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import AreaTreeDiagram from "@/components/diagram/AreaTreeDiagram";
import { useDiagramFocus } from "@/components/diagram/use-diagram-focus";
import { capPanelRows } from "@/lib/area-tree-diagram";
import type { AreaTreeSector } from "@/lib/area-tree-diagram";
import { categoryIconName } from "@/lib/category-diagram-icons";
import type { Data } from "@/app/sites/[domain]/projects/page";

type ProjectTask = Data["tasks"][number];

interface ProjectsDiagramViewProps {
  data: Data;
  domain: string;
  siteId?: string;
}

function taskCategoryId(task: ProjectTask): number | null {
  const product = Array.isArray((task as any).SellProduct)
    ? (task as any).SellProduct[0]
    : (task as any).SellProduct;
  if (!product) return null;
  if (product.category_id != null) return Number(product.category_id);
  const category = Array.isArray(product.category)
    ? product.category[0]
    : product.category;
  return category?.id != null ? Number(category.id) : null;
}

export function ProjectsDiagramView({
  data,
  domain,
  siteId,
}: ProjectsDiagramViewProps) {
  const router = useRouter();
  const { buildHref } = useDiagramFocus();

  const sectors: AreaTreeSector[] = useMemo(() => {
    const tasks = data.tasks ?? [];

    const tasksByCategory = new Map<string, ProjectTask[]>();
    for (const task of tasks) {
      const categoryId = taskCategoryId(task);
      const key = categoryId != null ? String(categoryId) : "none";
      const bucket = tasksByCategory.get(key) ?? [];
      bucket.push(task);
      tasksByCategory.set(key, bucket);
    }

    const buildPanel = (
      categoryKey: string,
      categoryTasks: ProjectTask[],
    ) =>
      capPanelRows(
        categoryTasks,
        (task) => ({
          id: String(task.id),
          label: task.unique_code || task.title || `Progetto ${task.id}`,
          onClick: () => {
            router.push(
              buildHref({ view: null, focus: null, edit: String(task.id) }),
            );
          },
        }),
        () => {
          router.push(buildHref({ view: "table", focus: `cat/${categoryKey}` }));
        },
      );

    const orderedCategories = [...(data.categories ?? [])].sort(
      (a, b) =>
        (a.sort_order ?? Number.MAX_SAFE_INTEGER) -
          (b.sort_order ?? Number.MAX_SAFE_INTEGER) ||
        a.name.localeCompare(b.name, "it"),
    );

    const result: AreaTreeSector[] = [];

    for (const category of orderedCategories) {
      const key = String(category.id);
      const categoryTasks = tasksByCategory.get(key);
      if (!categoryTasks || categoryTasks.length === 0) continue;

      const panel = buildPanel(key, categoryTasks);
      result.push({
        id: key,
        label: category.name,
        badge: String(categoryTasks.length),
        color: category.color ?? undefined,
        icon: categoryIconName(category.name, category.icon),
        panels: [
          {
            id: "projects",
            rows: panel.rows,
            moreCount: panel.moreCount,
            onMore: panel.onMore,
          },
        ],
      });
    }

    const uncategorized = tasksByCategory.get("none");
    if (uncategorized && uncategorized.length > 0) {
      const panel = buildPanel("none", uncategorized);
      result.push({
        id: "none",
        label: "Senza categoria",
        badge: String(uncategorized.length),
        icon: "Folder",
        panels: [
          {
            id: "projects",
            rows: panel.rows,
            moreCount: panel.moreCount,
            onMore: panel.onMore,
          },
        ],
      });
    }

    return result;
  }, [buildHref, data.categories, data.tasks, router]);

  const root = {
    label: "Progetti",
    sublabel: `${data.tasks?.length ?? 0} progetti`,
    icon: "faTable",
  };

  return (
    <AreaTreeDiagram
      root={root}
      sectors={sectors}
      siteId={siteId}
      diagramKey="projects"
    />
  );
}
