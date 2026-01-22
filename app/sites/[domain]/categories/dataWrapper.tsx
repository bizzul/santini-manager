"use client";

import React, { useMemo } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { Product_category } from "@/types/supabase";

const DataWrapper = ({
  data,
  domain,
}: {
  data: Product_category[];
  domain: string;
}) => {
  const columns = useMemo(() => createColumns(domain), [domain]);
  
  return (
    <div className="container mx-auto ">
      <DataTable columns={columns} data={data} domain={domain} />
    </div>
  );
};

export default DataWrapper;
