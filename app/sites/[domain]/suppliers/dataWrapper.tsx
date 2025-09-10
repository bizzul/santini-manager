import React from "react";
import { DataTable } from "./table";
import { columns } from "./columns";

const DataWrapper = ({ data, domain }: { data: any[]; domain: string }) => {
  return (
    <div className="container mx-auto ">
      <DataTable columns={columns} data={data} domain={domain} />
    </div>
  );
};

export default DataWrapper;
