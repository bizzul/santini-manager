"use client";

import React, { useMemo } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";

const DataWrapper = ({ data, domain }: { data: any; domain?: string }) => {
  const columns = useMemo(() => createColumns(domain), [domain]);
  
  return (
    <div className="container mx-auto ">
      <DataTable columns={columns} data={data} />
    </div>
  );
};

export default DataWrapper;
