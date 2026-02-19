"use client";

import React, { useMemo } from "react";
import { usePathname } from "next/navigation";
import { DataTable } from "./table";
import { createColumns } from "./columns";

const DataWrapper = ({ data }: { data: any }) => {
  const pathname = usePathname();
  const domain = pathname?.split("/")[2] || "";
  const columns = useMemo(() => createColumns(domain), [domain]);
  
  return (
    <div className="container mx-auto ">
      <DataTable columns={columns} data={data} />
    </div>
  );
};

export default DataWrapper;
