"use client";

import React, { useMemo } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { Manufacturer_category } from "@/types/supabase";

const DataWrapper = ({
  data,
  domain,
}: {
  data: Manufacturer_category[];
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
