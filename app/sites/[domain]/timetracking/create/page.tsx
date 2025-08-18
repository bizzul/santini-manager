import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/server";
import CreatePage from "@/components/timeTracking/create-page";
import { getUserContext } from "@/lib/auth-utils";

// Define types to match what CreatePage expects
interface Roles {
  id: number;
  name: string;
}

interface Task {
  id: number;
  unique_code?: string;
  client?: {
    businessName?: string;
  };
}

export type Datas = {
  tasks: Task[];
  roles: Roles[];
};

async function getData(session: any): Promise<Datas> {
  // Fetch data from your API here.
  // Fetch all items that match specified conditions
  const supabase = await createClient();
  const { data: tasks, error: tasksError } = await supabase
    .from("task")
    .select("*")
    .order("unique_code", { ascending: false });

  if (tasksError) {
    console.error("Error fetching tasks:", tasksError);
    return { tasks: [], roles: [] };
  }

  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("*");

  if (rolesError) {
    console.error("Error fetching roles:", rolesError);
    return { tasks: [], roles: [] };
  }
  
  // Transform the data to match our local types
  const transformedTasks: Task[] = (tasks || []).map((task: any) => ({
    id: task.id,
    unique_code: task.unique_code || undefined,
    client: task.client ? { businessName: task.client.businessName } : undefined,
  }));

  const transformedRoles: Roles[] = (roles || []).map((role: any) => ({
    id: role.id,
    name: role.name,
  }));

  return { tasks: transformedTasks, roles: transformedRoles };
}

async function Page() {
  const session = await getUserContext();

  const returnLink = `/api/auth/login?returnTo=${encodeURIComponent(
    "/timetracking/create"
  )}`;
  if (!session || !session.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect(returnLink);
  }

  const data = await getData(session);

  const { user } = session;

  return (
    <>
      <h1 className="pt-4 text-center text-xl">
        Ciao {user.given_name} {user.family_name}
      </h1>
      <CreatePage data={data} session={session} />
    </>
  );
}

export default Page;
