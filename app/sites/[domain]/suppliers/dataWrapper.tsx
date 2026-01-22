"use client";

import React, { useMemo } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";

const DataWrapper = ({ data, domain }: { data: any[]; domain: string }) => {
  const columns = useMemo(() => createColumns(domain), [domain]);
  
  return <DataTable columns={columns} data={data} domain={domain} />;
};

export default DataWrapper;
