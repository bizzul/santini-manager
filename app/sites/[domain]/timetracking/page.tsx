import React from "react";
import { Structure } from "@/components/structure/structure";
import { faClock } from "@fortawesome/free-solid-svg-icons";
import { getUserContext } from "@/lib/auth-utils";
import { Roles, Task, Timetracking, User } from "@/types/supabase";
import DialogCreate from "./dialogCreate";
import { createClient } from "@/utils/server";
import DataWrapper from "./dataWrapper";
import { redirect } from "next/navigation";
import { getSiteData } from "@/lib/fetchers";

// Force dynamic rendering to prevent static/dynamic conflicts
export const dynamic = "force-dynamic";
export const revalidate = 0;

export type Datas = {
  timetrackings: Timetracking[];
  tasks: Task[];
  users: User[];
  roles: Roles[];
};

async function getData(domain?: string): Promise<Datas> {
  const supabase = await createClient();
  let siteId = null;

  // Get site information
  if (domain) {
    try {
      const siteResult = await getSiteData(domain);
      if (siteResult?.data) {
        siteId = siteResult.data.id;
      }
    } catch (error) {
      console.error("Error fetching site data:", error);
    }
  }

  // Fetch timetrackings with site_id filtering through Task relationship
  let timetrackingsQuery = supabase
    .from("Timetracking")
    .select(
      `
      *,
      task:task_id(
        *,
        site_id
      ),
      user:employee_id(
        id,
        given_name,
        family_name,
        email
      ),
      roles:_RolesToTimetracking(
        role:Roles(
          id,
          name
        )
      )
    `
    )
    .order("created_at", { ascending: false });

  const { data: timetrackings, error: timetrackingsError } =
    await timetrackingsQuery;

  if (timetrackingsError) {
    console.error("Error fetching timetrackings:", timetrackingsError);
    return { timetrackings: [], tasks: [], users: [], roles: [] };
  }

  // Filter timetrackings by site_id if available
  const filteredTimetrackings = siteId
    ? timetrackings?.filter((t) => t.task?.site_id === siteId) || []
    : timetrackings || [];

  // Fetch tasks filtered by site_id if available
  let tasksQuery = supabase
    .from("Task")
    .select("*")
    .order("unique_code", { ascending: true });

  if (siteId) {
    tasksQuery = tasksQuery.eq("site_id", siteId);
  }

  const { data: tasks, error: tasksError } = await tasksQuery;

  // Fetch users filtered by site_id through user_sites relationship
  let users;
  let usersError = null;

  if (siteId) {
    // First get user IDs that belong to this site
    const { data: userSiteData, error: userSiteError } = await supabase
      .from("user_sites")
      .select("user_id")
      .eq("site_id", siteId);

    if (userSiteError) {
      usersError = userSiteError;
    } else {
      const userIds = userSiteData?.map((us) => us.user_id) || [];

      if (userIds.length > 0) {
        // Then fetch users with those authId values (user_sites.user_id contains authId, not id)
        const { data: usersData, error: usersDataError } = await supabase
          .from("User")
          .select("*")
          .eq("enabled", true)
          .in("authId", userIds)
          .order("family_name", { ascending: true });

        users = usersData;
        usersError = usersDataError;
      } else {
        users = [];
      }
    }
  } else {
    // If no siteId, fetch all enabled users
    const { data: usersData, error: usersDataError } = await supabase
      .from("User")
      .select("*")
      .eq("enabled", true)
      .order("family_name", { ascending: true });

    users = usersData;
    usersError = usersDataError;
  }

  // Fetch roles for the current site OR global roles (where site_id is null)
  let roles;
  let rolesError = null;

  if (siteId) {
    // Get roles for this site OR global roles (site_id is null)
    const { data: siteRoles, error: siteRolesError } = await supabase
      .from("Roles")
      .select("*")
      .eq("site_id", siteId);

    const { data: globalRoles, error: globalRolesError } = await supabase
      .from("Roles")
      .select("*")
      .is("site_id", null);

    if (siteRolesError || globalRolesError) {
      rolesError = siteRolesError || globalRolesError;
    } else {
      // Combine site-specific roles and global roles, removing duplicates
      const allRoles = [...(siteRoles || []), ...(globalRoles || [])];
      const uniqueRoles = allRoles.filter(
        (role, index, self) => index === self.findIndex((r) => r.id === role.id)
      );
      roles = uniqueRoles;
    }
  } else {
    // If no siteId, fetch all roles
    const { data: allRoles, error: allRolesError } = await supabase
      .from("Roles")
      .select("*");

    roles = allRoles;
    rolesError = allRolesError;
  }

  if (tasksError || usersError || rolesError) {
    console.error(
      "Error fetching data:",
      tasksError || usersError || rolesError
    );
    return { timetrackings: [], tasks: [], users: [], roles: [] };
  }

  return {
    timetrackings: filteredTimetrackings,
    tasks: tasks || [],
    users: users || [],
    roles: roles || [],
  };
}

async function Page({ params }: { params: Promise<{ domain: string }> }) {
  const resolvedParams = await params;
  const domain = resolvedParams.domain;

  //get initial data
  const data = await getData(domain);

  const session = await getUserContext();

  if (!session || !session.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }

  //@ts-ignore
  // const { user } = await getSession();
  return (
    // <SWRProvider>
    <div className="container">
      <DialogCreate data={data.tasks} users={data.users} roles={data.roles} />
      {data.timetrackings.length > 0 ? (
        <DataWrapper
          data={data.timetrackings}
          users={data.users}
          roles={data.roles}
          tasks={data.tasks}
        />
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
