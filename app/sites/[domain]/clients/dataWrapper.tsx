"use client";

import React, { useMemo } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { Client } from "@/types/supabase";

const DataWrapper = ({ data, domain }: { data: Client[]; domain: string }) => {
  const columns = useMemo(() => createColumns(domain), [domain]);
  
  return (
    <DataTable columns={columns} data={data} />
  );
};

export default DataWrapper;
