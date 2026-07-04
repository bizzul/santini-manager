"use client";

import React, { useMemo } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { Reseller } from "@/types/supabase";
import { useT } from "@/components/i18n/i18n-provider";

const DataWrapper = ({
  data,
  domain,
}: {
  data: Reseller[];
  domain: string;
}) => {
  const t = useT();
  const columns = useMemo(() => createColumns(domain, t), [domain, t]);

  return (
    <div className="container mx-auto">
      <DataTable columns={columns} data={data} />
    </div>
  );
};

export default DataWrapper;
