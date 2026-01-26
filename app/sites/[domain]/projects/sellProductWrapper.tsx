"use client";
import React, { useMemo } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { Data } from "./page";

const SellProductWrapper = ({ data, domain }: { data: Data; domain?: string }) => {
  const columns = useMemo(() => createColumns(domain), [domain]);
  
  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Lista Progetti</h2>
        <p className="text-sm text-muted-foreground mt-1">{data.tasks?.length || 0} progetti totali</p>
      </div>
      <DataTable 
        columns={columns} 
        data={data.tasks} 
        categories={data.categories}
      />
    </div>
  );
};

export default SellProductWrapper;
