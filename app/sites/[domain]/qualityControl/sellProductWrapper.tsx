"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { DataTable } from "./table";
import { columns } from "./columns";

// const getSellProducts = async () => {
//   const sellProducts = await fetch("../api/sellProducts").then((res) =>
//     res.json()
//   );
//   return sellProducts;
// };

const SellProductWrapper = ({ data }: { data: any[] }) => {
  return (
    <div className="container mx-auto ">
      <DataTable columns={columns} data={data} />
    </div>
  );
};

export default SellProductWrapper;
