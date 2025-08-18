import React from "react";
import { DataTable } from "./table";
import { columns } from "./columns";

const DataWrapper = ({ data }: { data: any[] }) => {
  return (
    <div className="container mx-auto ">
      <DataTable columns={columns} data={data} />
    </div>
  );
};

export default DataWrapper;
