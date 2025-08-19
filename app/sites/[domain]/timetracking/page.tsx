import React from "react";
import { Structure } from "@/components/structure/structure";
import { faClock } from "@fortawesome/free-solid-svg-icons";
import { getUserContext } from "@/lib/auth-utils";
import { Roles, Task, Timetracking, User } from "@/types/supabase";
import DialogCreate from "./dialogCreate";
import { createClient } from "@/utils/server";
import DataWrapper from "./dataWrapper";
import { redirect } from "next/navigation";

export type Datas = {
  timetrackings: Timetracking[];
  tasks: Task[];
  users: User[];
  roles: Roles[];
};

async function getData(): Promise<Datas> {
  // Fetch data from your API here.
  const supabase = await createClient();
  const { data: timetrackings, error: timetrackingsError } = await supabase
    .from("timetracking")
    .select("*")
    .order("created_at", { ascending: false });

  if (timetrackingsError) {
    console.error("Error fetching timetrackings:", timetrackingsError);
    return { timetrackings: [], tasks: [], users: [], roles: [] };
  }

  const { data: tasks, error: tasksError } = await supabase
    .from("task")
    .select("*")
    .order("unique_code", { ascending: true });

  const { data: users, error: usersError } = await supabase
    .from("user")
    .select("*")
    .eq("enabled", true)
    .order("family_name", { ascending: true });

  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("*");

  if (timetrackingsError || tasksError || usersError || rolesError) {
    console.error(
      "Error fetching data:",
      timetrackingsError || tasksError || usersError || rolesError
    );
    return { timetrackings: [], tasks: [], users: [], roles: [] };
  }

  return { timetrackings, tasks, users, roles };
}

async function Page() {
  //get initial data
  const data = await getData();

  const session = await getUserContext();

  if (!session || !session.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }

  // Now it's safe to use session.user
  const { user } = session;
  //@ts-ignore
  // const { user } = await getSession();
  return (
    // <SWRProvider>
    <div className="container">
      <DialogCreate data={data.tasks} users={data.users} roles={data.roles} />
      {data.timetrackings.length > 0 ? (
        <DataWrapper data={data.timetrackings} />
      ) : (
        <div className="w-full h-full text-center">
          <h1 className="font-bold text-2xl">
            Nessun rapporto ore registrato!
          </h1>
          <p>Premi (Aggiungi rapporto) per aggiungere il tuo primo rapporto!</p>
        </div>
      )}
    </div>
  );
}

export default Page;
