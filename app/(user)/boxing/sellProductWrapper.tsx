"use client";
import React from "react";
import { DataTable } from "./table";
import { columns } from "./columns";
import { PackingControl } from "@prisma/client";

const SellProductWrapper = ({ data }: { data: PackingControl[] }) => {
  return (
    <div className="container mx-auto ">
      <DataTable columns={columns} data={data} />
    </div>
  );
};

export default SellProductWrapper;
