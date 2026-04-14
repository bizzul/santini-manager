"use client";
import React, { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { Data } from "./page";
import DialogEdit from "./dialogEdit";

const SellProductWrapper = ({ data, domain }: { data: Data; domain?: string }) => {
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
    [resolvedDomain, domain, data.clients, data.activeProducts, data.kanbans]
  );
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  
  // Handle ?edit=taskId query parameter
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
  
  // Clear URL param when dialog closes
  const handleEditClose = () => {
    setEditOpen(false);
    setSelectedTask(null);
    // Remove edit param from URL
    const editParam = searchParams.get("edit");
    if (editParam && resolvedDomain) {
      router.replace(`/sites/${resolvedDomain}/projects`, { scroll: false });
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Lista Progetti</h2>
        <p className="text-sm text-muted-foreground mt-1">{data.tasks?.length || 0} progetti totali</p>
      </div>
      <DataTable 
        columns={columns} 
        data={data.tasks} 
        categories={data.categories}
        domain={resolvedDomain || domain}
      />
      
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
