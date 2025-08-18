"use client";
import React from "react";
import { DataTable } from "./table";
import { columns } from "./columns";
import { Data } from "./page";

const SellProductWrapper = ({ data }: { data: Data }) => {
  return (
    <div className="container mx-auto ">
      <DataTable columns={columns} data={data.tasks} />
    </div>
  );
};

export default SellProductWrapper;
