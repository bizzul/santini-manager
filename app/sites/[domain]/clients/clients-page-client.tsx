"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import DialogEdit from "./dialogEdit";
import { DiagramViewToolbar } from "@/components/diagram/diagram-view-toolbar";
import {
  ClientsDiagramView,
  filterClientsByFocus,
} from "@/components/diagram/clients-diagram-view";
import { useDiagramFocus } from "@/components/diagram/use-diagram-focus";
import { cn } from "@/lib/utils";
import type { RowVisualInsight } from "@/types/supabase";

interface ClientsPageClientProps {
  clients: any[];
  domain: string;
  siteId?: string;
  rowInsights?: Record<number, RowVisualInsight>;
}

export function ClientsPageClient({
  clients,
  domain,
  siteId,
  rowInsights,
}: ClientsPageClientProps) {
  const columns = useMemo(
    () => createColumns(domain, rowInsights ?? {}),
    [domain, rowInsights],
  );
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isDiagram, focusPath, setView } = useDiagramFocus();
  const [editOpen, setEditOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const filteredByFocus = filterClientsByFocus(clients, focusPath);
  const tableData = filteredByFocus ?? clients;

  useEffect(() => {
    const editClientId = searchParams.get("edit");
    if (!editClientId) return;

    const clientId = parseInt(editClientId, 10);
    if (!Number.isFinite(clientId)) return;

    const client = clients.find((item) => item.id === clientId);
    if (client) {
      setSelectedClient(client);
      setEditOpen(true);
    }
  }, [searchParams, clients]);

  const handleClose = () => {
    setEditOpen(false);
    setSelectedClient(null);
    if (searchParams.get("edit")) {
      const returnTo = searchParams.get("returnTo");
      if (returnTo && returnTo.startsWith("/")) {
        router.replace(returnTo, { scroll: false });
        return;
      }
      const params = new URLSearchParams(searchParams.toString());
      params.delete("edit");
      const qs = params.toString();
      router.replace(
        qs ? `/sites/${domain}/clients?${qs}` : `/sites/${domain}/clients`,
        { scroll: false },
      );
    }
  };

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
          <ClientsDiagramView
            clients={clients}
            domain={domain}
            siteId={siteId}
          />
        </div>
      ) : (
        <DataTable columns={columns} data={tableData} domain={domain} />
      )}

      {selectedClient ? (
        <DialogEdit
          isOpen={editOpen}
          data={selectedClient}
          setData={setSelectedClient}
          setOpen={(next) => {
            if (!next) {
              handleClose();
              return;
            }
            setEditOpen(true);
          }}
        />
      ) : null}
    </div>
  );
}
