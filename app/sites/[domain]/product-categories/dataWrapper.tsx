"use client";

import React, { useMemo } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { SellProductCategory } from "@/types/supabase";

const DataWrapper = ({
  data,
  domain,
}: {
  data: SellProductCategory[];
  domain: string;
}) => {
  const columns = useMemo(() => createColumns(), []);
  
  return (
    <div className="container mx-auto">
      <DataTable columns={columns} data={data} domain={domain} />
    </div>
  );
};

export default DataWrapper;
