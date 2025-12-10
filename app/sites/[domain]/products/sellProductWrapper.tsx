"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { SellProduct } from "@/types/supabase";

const SellProductWrapper = ({
  data,
  domain,
  siteId,
}: {
  data: SellProduct[];
  domain: string;
  siteId: string;
}) => {
  return (
    <DataTable columns={createColumns(domain)} data={data} domain={domain} />
  );
};

export default SellProductWrapper;
