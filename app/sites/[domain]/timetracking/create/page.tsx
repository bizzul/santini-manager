import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/server";
import CreatePage, {
  InternalActivity,
} from "@/components/timeTracking/create-page";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

interface TodayEntry {
  id: number;
  hours: number;
  minutes: number;
  totalTime: number;
  description?: string;
  activity_type?: string;
  internal_activity?: string;
  task?: {
    unique_code?: string;
    client?: {
      businessName?: string;
    };
  };
  roles?: {
    name?: string;
  }[];
  created_at: string;
}

// Type for all user entries (extended from TodayEntry)
interface AllUserEntry extends TodayEntry {
  description_type?: string;
}

export type Datas = {
  tasks: Task[];
  roles: Roles[];
  todayEntries: TodayEntry[];
  allUserEntries: AllUserEntry[];
  internalActivities: InternalActivity[];
};

async function getData(siteId: string, userId: string): Promise<Datas> {
  const supabase = await createClient();

  // Filter tasks by site_id
  const { data: tasks, error: tasksError } = await supabase
    .from("Task")
    .select("*, client:Client(businessName)")
    .eq("site_id", siteId)
    .order("unique_code", { ascending: false });

  if (tasksError) {
    console.error("Error fetching tasks:", tasksError);
    return { tasks: [], roles: [], todayEntries: [], allUserEntries: [], internalActivities: [] };
  }

  // Fetch internal activities (global and site-specific)
  const { data: activitiesData, error: activitiesError } = await supabase
    .from("internal_activities")
    .select("id, code, label, site_id, sort_order")
    .eq("is_active", true)
    .or(`site_id.is.null,site_id.eq.${siteId}`)
    .order("sort_order", { ascending: true });

  if (activitiesError) {
    console.error("Error fetching internal activities:", activitiesError);
  }

  const internalActivities: InternalActivity[] = activitiesData || [];

  // Fetch today's timetracking entries for the current user
  // First, get the user's internal ID from their auth ID
  const { data: userData, error: userError } = await supabase
    .from("User")
    .select("id")
    .eq("authId", userId)
    .single();

  // Get roles assigned to the user from _RolesToUser junction table
  let roles: { id: number; name: string }[] = [];

  if (!userError && userData) {
    // Get role IDs assigned to this user
    const { data: userRoleLinks, error: userRolesError } = await supabase
      .from("_RolesToUser")
      .select("A")
      .eq("B", userData.id);

    if (userRolesError) {
      console.error("Error fetching user role links:", userRolesError);
    } else if (userRoleLinks && userRoleLinks.length > 0) {
      const roleIds = userRoleLinks.map((link: { A: number }) => link.A);

      // Get the roles that are assigned to the user AND belong to this site (or are global)
      const { data: rolesData, error: rolesError } = await supabase
        .from("Roles")
        .select("id, name")
        .in("id", roleIds)
        .or(`site_id.eq.${siteId},site_id.is.null`);

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
      } else {
        roles = rolesData || [];
      }
    }
  }

  let todayEntries: TodayEntry[] = [];
  let allUserEntries: AllUserEntry[] = [];

  if (!userError && userData) {
    // Get start and end of today (in UTC)
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    // Get task IDs for this site for filtering
    const siteTaskIds = (tasks || []).map((t: any) => t.id);

    // Fetch today's entries (filtered by site)
    let todayQuery = supabase
      .from("Timetracking")
      .select(
        `
        id,
        hours,
        minutes,
        totalTime,
        description,
        activity_type,
        internal_activity,
        created_at,
        task:task_id(unique_code, client:Client(businessName)),
        roles:_RolesToTimetracking(role:Roles(name))
      `
      )
      .eq("employee_id", userData.id)
      .gte("created_at", startOfDay.toISOString())
      .lt("created_at", endOfDay.toISOString())
      .order("created_at", { ascending: false });

    if (siteTaskIds.length > 0) {
      todayQuery = todayQuery.or(`site_id.eq.${siteId},task_id.in.(${siteTaskIds.join(",")})`);
    } else {
      todayQuery = todayQuery.eq("site_id", siteId);
    }

    const { data: timetrackingData, error: timetrackingError } = await todayQuery;

    if (timetrackingError) {
      console.error("Error fetching today's timetracking:", timetrackingError);
    } else {
      todayEntries = (timetrackingData || []).map((entry: any) => ({
        id: entry.id,
        hours: entry.hours,
        minutes: entry.minutes,
        totalTime: entry.totalTime,
        description: entry.description,
        activity_type: entry.activity_type,
        internal_activity: entry.internal_activity,
        created_at: entry.created_at,
        task: entry.task,
        roles: entry.roles?.map((r: any) => r.role) || [],
      }));
    }

    // Fetch ALL entries for the user (for "Le mie ore" tab)
    // Build query with proper site filtering
    let allEntriesQuery = supabase
      .from("Timetracking")
      .select(
        `
        id,
        hours,
        minutes,
        totalTime,
        description,
        description_type,
        activity_type,
        internal_activity,
        created_at,
        task:task_id(unique_code, client:Client(businessName)),
        roles:_RolesToTimetracking(role:Roles(id, name))
      `
      )
      .eq("employee_id", userData.id)
      .order("created_at", { ascending: false });

    // Filter by site (either direct site_id match OR task is from this site)
    if (siteTaskIds.length > 0) {
      allEntriesQuery = allEntriesQuery.or(`site_id.eq.${siteId},task_id.in.(${siteTaskIds.join(",")})`);
    } else {
      allEntriesQuery = allEntriesQuery.eq("site_id", siteId);
    }

    const { data: allEntriesData, error: allEntriesError } = await allEntriesQuery;

    if (allEntriesError) {
      console.error("Error fetching all user timetracking:", allEntriesError);
    } else {
      allUserEntries = (allEntriesData || []).map((entry: any) => ({
        id: entry.id,
        hours: entry.hours,
        minutes: entry.minutes,
        totalTime: entry.totalTime,
        description: entry.description,
        description_type: entry.description_type,
        activity_type: entry.activity_type,
        internal_activity: entry.internal_activity,
        created_at: entry.created_at,
        task: entry.task,
        roles: entry.roles?.map((r: any) => r.role) || [],
      }));
    }
  }

  const transformedTasks: Task[] = (tasks || []).map((task: any) => ({
    id: task.id,
    unique_code: task.unique_code || undefined,
    client: task.client
      ? { businessName: task.client.businessName }
      : undefined,
  }));

  const transformedRoles: Roles[] = (roles || []).map((role: any) => ({
    id: role.id,
    name: role.name,
  }));

  return {
    tasks: transformedTasks,
    roles: transformedRoles,
    todayEntries,
    allUserEntries,
    internalActivities,
  };
}

async function Page({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const session = await getUserContext();

  const returnLink = `/api/auth/login?returnTo=${encodeURIComponent(
    "/timetracking/create"
  )}`;

  if (!session || !session.user) {
    return redirect(returnLink);
  }

  // Get site data to filter by site_id
  const siteResponse = await getSiteData(domain);
  if (!siteResponse?.data?.id) {
    return redirect("/sites/select?error=site_not_found");
  }

  const siteId = siteResponse.data.id;
  const { user } = session;
  const data = await getData(siteId, user.id);

  // Get user profile data
  const userProfile = user?.user_metadata;
  const displayName =
    userProfile?.full_name ||
    (userProfile?.name && userProfile?.last_name
      ? `${userProfile.name} ${userProfile.last_name}`
      : user?.email || "User");
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/sites/${domain}/timetracking`}
              className="p-2 hover:bg-background/80 rounded-xl transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </Link>
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Ciao {userProfile?.name || user?.email?.split("@")[0]}
                </p>
                <h1 className="text-xl md:text-2xl font-bold">
                  Registrazione ore
                </h1>
              </div>
            </div>
            {/* User Avatar */}
            <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-lg">
              <AvatarImage
                src={userProfile?.picture || undefined}
                alt={displayName}
              />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      <CreatePage
        data={data}
        session={session}
        internalActivities={data.internalActivities}
        allUserEntries={data.allUserEntries}
        domain={domain}
        siteId={siteId}
      />
    </div>
  );
}

export default Page;
