import React from "react";
import { DataTable } from "./table";
import { columns } from "./columns";
import { Product } from "@prisma/client";

const DataWrapper = ({ data }: { data: Product[] }) => {
  return (
    <div className="container mx-auto ">
      <DataTable columns={columns} data={data} />
    </div>
  );
};

export default DataWrapper;
