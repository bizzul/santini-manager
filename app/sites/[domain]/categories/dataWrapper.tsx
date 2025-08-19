import React from "react";
import { DataTable } from "./table";
import { columns } from "./columns";
import { Product_category } from "@/types/supabase";

const DataWrapper = ({ data }: { data: Product_category[] }) => {
  return (
    <div className="container mx-auto ">
      <DataTable columns={columns} data={data} />
    </div>
  );
};

export default DataWrapper;
