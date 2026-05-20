"use client";

import React, { useMemo } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { InventoryCategory, InventorySupplier } from "@/types/supabase";

const DataWrapper = ({
  data,
  domain,
  categories = [],
  suppliers = [],
}: {
  data: any;
  domain?: string;
  categories?: InventoryCategory[];
  suppliers?: InventorySupplier[];
}) => {
  const columns = useMemo(
    () => createColumns(domain, suppliers),
    [domain, suppliers],
  );

  return (
    <div className="w-full min-w-0">
      <DataTable columns={columns} data={data} categories={categories} />
    </div>
  );
};

export default DataWrapper;
