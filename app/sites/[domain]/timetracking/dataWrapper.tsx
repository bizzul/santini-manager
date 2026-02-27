"use client";

import React, { useMemo } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { Timetracking, User, Roles, Task } from "@/types/supabase";

interface InternalActivity {
  id: string;
  code: string;
  label: string;
  site_id: string | null;
  sort_order: number;
}

interface DataWrapperProps {
  data: Timetracking[];
  users: User[];
  roles: Roles[];
  tasks: Task[];
  domain?: string;
  internalActivities?: InternalActivity[];
}

const DataWrapper = ({ data, users, roles, tasks, domain, internalActivities = [] }: DataWrapperProps) => {
  const columns = useMemo(() => createColumns(domain, internalActivities), [domain, internalActivities]);
  
  return (
    <div className="container mx-auto ">
      <DataTable
        columns={columns}
        data={data}
        users={users}
        roles={roles}
        tasks={tasks}
      />
    </div>
  );
};

export default DataWrapper;
