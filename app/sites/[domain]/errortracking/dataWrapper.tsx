"use client";

import React, { useMemo } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";

const DataWrapper = ({ data }: { data: any }) => {
  const columns = useMemo(() => createColumns(), []);
  
  return (
    <div className="container mx-auto ">
      <DataTable columns={columns} data={data} />
    </div>
  );
};

export default DataWrapper;
