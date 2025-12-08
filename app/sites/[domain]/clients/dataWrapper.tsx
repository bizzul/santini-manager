import React from "react";
import { DataTable } from "./table";
import { columns } from "./columns";
import { Client } from "@/types/supabase";

const DataWrapper = ({ data }: { data: Client[] }) => {
  return (
    <DataTable columns={columns} data={data} />
  );
};

export default DataWrapper;
