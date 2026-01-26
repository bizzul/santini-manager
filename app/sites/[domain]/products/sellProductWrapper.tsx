"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { SellProduct, SellProductCategory } from "@/types/supabase";

const SellProductWrapper = ({
  data,
  domain,
  siteId,
  categories = [],
}: {
  data: SellProduct[];
  domain: string;
  siteId: string;
  categories?: SellProductCategory[];
}) => {
  // Memoize columns to prevent scroll reset on row selection
  const columns = useMemo(() => createColumns(domain), [domain]);
  
  return (
    <DataTable columns={columns} data={data} domain={domain} categories={categories} />
  );
};

export default SellProductWrapper;
