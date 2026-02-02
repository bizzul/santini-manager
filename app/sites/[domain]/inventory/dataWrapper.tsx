"use client";

import React, { useMemo } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { InventoryCategory } from "@/types/supabase";

const DataWrapper = ({
  data,
  domain,
  categories = [],
}: {
  data: any;
  domain?: string;
  categories?: InventoryCategory[];
}) => {
  const columns = useMemo(() => createColumns(domain), [domain]);

  return (
    <div className="container mx-auto ">
      <DataTable columns={columns} data={data} categories={categories} />
    </div>
  );
};

export default DataWrapper;
