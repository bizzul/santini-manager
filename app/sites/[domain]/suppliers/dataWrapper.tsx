import React from "react";
import { DataTable } from "./table";
import { columns } from "./columns";
import { Product_category, Supplier } from "@prisma/client";

const DataWrapper = ({ data }: { data: Supplier[] }) => {
  return (
    <div className="container mx-auto ">
      <DataTable columns={columns} data={data} />
    </div>
  );
};

export default DataWrapper;
