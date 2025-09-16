import React from "react";
import { DataTable } from "./table";
import { columns } from "./columns";
import { Timetracking, User, Roles, Task } from "@/types/supabase";

interface DataWrapperProps {
  data: Timetracking[];
  users: User[];
  roles: Roles[];
  tasks: Task[];
}

const DataWrapper = ({ data, users, roles, tasks }: DataWrapperProps) => {
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
