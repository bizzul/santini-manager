"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { DataTable } from "./table";
import { columns } from "./columns";
import { SellProduct } from "@prisma/client";

const SellProductWrapper = ({ data }: { data: SellProduct[] }) => {
  return (
    <div className="container mx-auto ">
      <DataTable columns={columns} data={data} />
    </div>
  );
};

export default SellProductWrapper;
