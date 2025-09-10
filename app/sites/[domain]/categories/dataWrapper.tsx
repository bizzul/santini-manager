import React from "react";
import { DataTable } from "./table";
import { columns } from "./columns";
import { Product_category } from "@/types/supabase";

const DataWrapper = ({
  data,
  domain,
}: {
  data: Product_category[];
  domain: string;
}) => {
  return (
    <div className="container mx-auto ">
      <DataTable columns={columns} data={data} domain={domain} />
    </div>
  );
};

export default DataWrapper;
