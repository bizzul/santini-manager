"use client";

import React from "react";
import { DataTable } from "./table";
import { Collaborator } from "./columns";

interface DataWrapperProps {
  data: Collaborator[];
  domain: string;
  siteId: string;
  isAdmin: boolean;
  currentUserRole?: string;
}

const DataWrapper = ({
  data,
  domain,
  siteId,
  isAdmin,
  currentUserRole,
}: DataWrapperProps) => {
  return (
    <div className="w-full">
      <DataTable
        data={data}
        domain={domain}
        siteId={siteId}
        isAdmin={isAdmin}
        currentUserRole={currentUserRole}
      />
    </div>
  );
};

export default DataWrapper;
