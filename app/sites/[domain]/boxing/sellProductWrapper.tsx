"use client";
import React from "react";
import { DataTable } from "./table";
import { columns } from "./columns";

const SellProductWrapper = ({ data }: { data: any[] }) => {
  return (
    <div className="container mx-auto ">
      <DataTable columns={columns} data={data} />
    </div>
  );
};

export default SellProductWrapper;
