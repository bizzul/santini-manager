"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { SellProduct } from "@/types/supabase";

const SellProductWrapper = ({
  data,
  domain,
}: {
  data: SellProduct[];
  domain: string;
}) => {
  return (
    <div className="container mx-auto ">
      <DataTable columns={createColumns(domain)} data={data} domain={domain} />
    </div>
  );
};

export default SellProductWrapper;
