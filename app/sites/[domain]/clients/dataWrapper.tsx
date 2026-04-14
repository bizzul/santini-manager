"use client";

import React, { useEffect, useMemo, useState } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { useRouter, useSearchParams } from "next/navigation";
import DialogEdit from "./dialogEdit";

const DataWrapper = ({ data, domain }: { data: any[]; domain: string }) => {
  const columns = useMemo(() => createColumns(domain), [domain]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  useEffect(() => {
    const editClientId = searchParams.get("edit");
    if (!editClientId) {
      return;
    }

    const clientId = parseInt(editClientId, 10);
    if (!Number.isFinite(clientId)) {
      return;
    }

    const client = data.find((item) => item.id === clientId);
    if (client) {
      setSelectedClient(client);
      setEditOpen(true);
    }
  }, [searchParams, data]);

  const handleClose = () => {
    setEditOpen(false);
    setSelectedClient(null);
    if (searchParams.get("edit")) {
      router.replace(`/sites/${domain}/clients`, { scroll: false });
    }
  };

  return (
    <>
      <DataTable columns={columns} data={data} domain={domain} />
      {selectedClient && (
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
      )}
    </>
  );
};

export default DataWrapper;
