"use client";

import React, { useMemo } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import type { RowVisualInsight } from "@/types/supabase";

const DataWrapper = ({
  data,
  domain,
  rowInsights,
}: {
  data: any[];
  domain: string;
  rowInsights?: Record<number, RowVisualInsight>;
}) => {
  const columns = useMemo(
    () => createColumns(domain, rowInsights ?? {}),
    [domain, rowInsights]
  );
  
  return <DataTable columns={columns} data={data} domain={domain} />;
};

export default DataWrapper;
