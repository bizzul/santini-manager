"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { Data } from "./page";
import DialogEdit from "./dialogEdit";
import { DiagramViewToolbar } from "@/components/diagram/diagram-view-toolbar";
import { ProjectsDiagramView } from "@/components/diagram/projects-diagram-view";
import { useDiagramFocus } from "@/components/diagram/use-diagram-focus";
import { parseFocusPath } from "@/lib/diagram-focus";
import { cn } from "@/lib/utils";

const SellProductWrapper = ({
  data,
  domain,
  siteId,
}: {
  data: Data;
  domain?: string;
  siteId?: string;
}) => {
  const resolvedDomain = useMemo(() => {
    if (domain && domain.trim().length > 0) {
      return domain;
    }

    if (typeof window === "undefined") {
      return "";
    }

    const pathnameDomain = window.location.pathname.split("/")[2];
    if (pathnameDomain) {
      return pathnameDomain;
    }

    const hostname = window.location.hostname;
    if (hostname.endsWith(".localhost")) {
      return hostname.split(".")[0] || "";
    }

    const hostParts = hostname.split(".");
    if (hostParts.length > 2) {
      return hostParts[0] || "";
    }

    return "";
  }, [domain]);

  const columns = useMemo(
    () =>
      createColumns({
        domain: resolvedDomain || domain,
        clients: data.clients,
        products: data.activeProducts,
        kanbans: data.kanbans,
      }),
    [resolvedDomain, domain, data.clients, data.activeProducts, data.kanbans],
  );
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isDiagram, focusPath, setView } = useDiagramFocus();

  const [editOpen, setEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  useEffect(() => {
    const editTaskId = searchParams.get("edit");
    if (editTaskId) {
      const taskId = parseInt(editTaskId, 10);
      const task = data.tasks?.find((t: any) => t.id === taskId);
      if (task) {
        setSelectedTask(task);
        setEditOpen(true);
      }
    }
  }, [searchParams, data.tasks]);

  const handleEditClose = () => {
    setEditOpen(false);
    setSelectedTask(null);
    const editParam = searchParams.get("edit");
    if (editParam && resolvedDomain) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("edit");
      const qs = params.toString();
      router.replace(
        qs
          ? `/sites/${resolvedDomain}/projects?${qs}`
          : `/sites/${resolvedDomain}/projects`,
        { scroll: false },
      );
    }
  };

  const categorySegment = parseFocusPath(focusPath).find(
    (segment) => segment.type === "cat",
  );

  const tableData = useMemo(() => {
    if (!categorySegment) return data.tasks;
    return (data.tasks ?? []).filter((task) => {
      const product = Array.isArray((task as any).SellProduct)
        ? (task as any).SellProduct[0]
        : (task as any).SellProduct;
      const categoryId =
        product?.category_id != null
          ? Number(product.category_id)
          : Array.isArray(product?.category)
            ? product?.category[0]?.id
            : product?.category?.id;
      const key = categoryId != null ? String(categoryId) : "none";
      return key === categorySegment.value;
    });
  }, [categorySegment, data.tasks]);

  return (
    <div
      className={cn(
        isDiagram ? "flex h-full min-h-0 flex-col gap-4" : "space-y-4",
      )}
    >
      <DiagramViewToolbar
        domain={resolvedDomain || domain || ""}
        value={isDiagram ? "diagram" : "table"}
        onChange={(mode) => setView(mode === "diagram" ? "diagram" : "table")}
        leading={
          <div>
            <h2 className="text-lg font-semibold">Lista Progetti</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.tasks?.length || 0} progetti totali
            </p>
          </div>
        }
      />

      {isDiagram ? (
        <div className="min-h-0 flex-1">
          <ProjectsDiagramView
            data={data}
            domain={resolvedDomain || domain || ""}
            siteId={siteId}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={tableData}
          categories={data.categories}
          domain={resolvedDomain || domain}
        />
      )}

      <DialogEdit
        isOpen={editOpen}
        data={selectedTask}
        setData={setSelectedTask}
        setOpen={handleEditClose as any}
      />
    </div>
  );
};

export default SellProductWrapper;
