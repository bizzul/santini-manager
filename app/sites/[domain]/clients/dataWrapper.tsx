import React from "react";
import { DataTable } from "./table";
import { columns } from "./columns";
import { Client } from "@/types/supabase";

const DataWrapper = ({ data }: { data: Client[] }) => {
  return (
    <div className="container mx-auto ">
      <DataTable columns={columns} data={data} />
    </div>
  );
};

export default DataWrapper;
