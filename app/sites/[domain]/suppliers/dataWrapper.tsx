import React from "react";
import { DataTable } from "./table";
import { columns } from "./columns";

const DataWrapper = ({ data, domain }: { data: any[]; domain: string }) => {
  return <DataTable columns={columns} data={data} domain={domain} />;
};

export default DataWrapper;
