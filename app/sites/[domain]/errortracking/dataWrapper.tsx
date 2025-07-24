import React from "react";
import { DataTable } from "./table";
import { columns } from "./columns";
import { Errortracking, Product } from "@prisma/client";

const DataWrapper = ({ data }: { data: Errortracking[] }) => {
  return (
    <div className="container mx-auto ">
      <DataTable columns={columns} data={data} />
    </div>
  );
};

export default DataWrapper;
