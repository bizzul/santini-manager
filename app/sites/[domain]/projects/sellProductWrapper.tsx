"use client";
import React, { useMemo } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { Data } from "./page";

const SellProductWrapper = ({ data, domain }: { data: Data; domain?: string }) => {
  const columns = useMemo(() => createColumns(domain), [domain]);
  
  return (
    <div className="container mx-auto ">
      <DataTable 
        columns={columns} 
        data={data.tasks} 
        categories={data.categories}
      />
    </div>
  );
};

export default SellProductWrapper;
