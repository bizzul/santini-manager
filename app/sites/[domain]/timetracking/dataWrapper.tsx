"use client";

import React, { useMemo } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { Timetracking, User, Roles, Task } from "@/types/supabase";

interface DataWrapperProps {
  data: Timetracking[];
  users: User[];
  roles: Roles[];
  tasks: Task[];
  domain?: string;
}

const DataWrapper = ({ data, users, roles, tasks, domain }: DataWrapperProps) => {
  const columns = useMemo(() => createColumns(domain), [domain]);
  
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
