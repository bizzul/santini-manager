"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
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
  // Memoize columns to prevent scroll reset on row selection
  const columns = useMemo(() => createColumns(domain), [domain]);
  
  return (
    <DataTable columns={columns} data={data} domain={domain} />
  );
};

export default SellProductWrapper;
