import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  getServerSiteContext,
  fetchTasksWithRelations,
  fetchFactoryDashboardData,
  fetchInventoryDashboardData,
  fetchProductsDashboardData,
} from "@/lib/server-data";
import { getUserContext } from "@/lib/auth-utils";
import { isAdminOrSuperadmin } from "@/lib/permissions";
import { getCommandDeckEnabledForSite } from "@/lib/command-deck-settings.server";
import { ActivitiesDeckView } from "@/components/command-deck/ActivitiesDeckView";
import {
  activitiesToOrbitGroups,
  buildActivitiesPayload,
  normalizeInventoryAlerts,
  normalizeOpenTasks,
  normalizePendingLeaveRequests,
  normalizeProductAlerts,
} from "@/components/command-deck/activities-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  try {
    const siteContext = await getServerSiteContext(domain);
    return {
      title: `${siteContext?.siteData?.name || "Site"} · Attività aperte`,
    };
  } catch {
    return { title: "Attività aperte" };
  }
}

export default async function CommandDeckActivitiesPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  const siteContext = await getServerSiteContext(domain);
  if (!siteContext) {
    notFound();
  }

  const commandDeckEnabled = await getCommandDeckEnabledForSite(
    siteContext.siteId,
  );
  if (!commandDeckEnabled) {
    notFound();
  }

  const userContext = await getUserContext();
  if (!userContext) {
    redirect("/login");
  }

  const authUserId = userContext.userId || userContext.user?.id;
  if (!authUserId) {
    redirect("/login");
  }

  const userMetadata = userContext.user?.user_metadata ?? {};

  const commanderName: string =
    userMetadata.full_name ||
    (userMetadata.name && userMetadata.last_name
      ? `${userMetadata.name} ${userMetadata.last_name}`
      : "") ||
    [userMetadata.given_name, userMetadata.family_name]
      .filter(Boolean)
      .join(" ") ||
    userContext.user?.email ||
    "Commander";

  const commanderAvatarUrl: string | null =
    userMetadata.picture || userMetadata.avatar_url || null;

  const siteName: string =
    siteContext.siteData?.name || domain || "Santini";

  const supabase = await createClient();

  const [
    tasks,
    factoryData,
    inventoryDashboard,
    productsDashboard,
    leaveResult,
    userRowResult,
    speditoColumnsResult,
  ] = await Promise.all([
    fetchTasksWithRelations(siteContext.siteId).catch(() => []),
    fetchFactoryDashboardData(siteContext.siteId).catch(() => ({
      departments: [],
    })),
    fetchInventoryDashboardData(siteContext.siteId).catch(() => ({
      alerts: [],
    })),
    fetchProductsDashboardData(siteContext.siteId).catch(() => ({
      alerts: [],
    })),
    (async () => {
      let query = supabase
        .from("leave_requests")
        .select("*")
        .eq("site_id", siteContext.siteId)
        .eq("status", "pending");
      if (!isAdminOrSuperadmin(userContext.role)) {
        query = query.eq("user_id", authUserId);
      }
      return query;
    })(),
    supabase
      .from("User")
      .select("id")
      .eq("authId", authUserId)
      .maybeSingle(),
    supabase
      .from("KanbanColumn")
      .select("id")
      .eq("identifier", "SPEDITO"),
  ]);

  const leaveRequests = leaveResult.data ?? [];

  const numericUserId = userRowResult.data?.id ?? null;
  const speditoColumnIds = new Set(
    (speditoColumnsResult.data ?? []).map((c: { id: number | string }) => c.id),
  );
  const factoryKanbanIds = new Set<number | string>(
    (factoryData.departments ?? [])
      .map((d: { id?: number | string }) => d.id)
      .filter((id): id is number | string => id !== undefined && id !== null),
  );

  const taskActivities = normalizeOpenTasks(tasks, {
    domain,
    authUserId,
    numericUserId,
    userRole: userContext.role,
    speditoColumnIds,
    factoryKanbanIds,
    filterByUser: true,
  });

  const leaveActivities = normalizePendingLeaveRequests(leaveRequests, domain);

  const inventoryAlerts = normalizeInventoryAlerts(
    inventoryDashboard.alerts ?? [],
    domain,
  );

  const productAlerts = normalizeProductAlerts(
    productsDashboard.alerts ?? [],
    domain,
  );

  const payload = buildActivitiesPayload([
    ...taskActivities,
    ...leaveActivities,
    ...inventoryAlerts,
    ...productAlerts,
  ]);

  const orbitGroups = activitiesToOrbitGroups(payload);

  return (
    <div className="h-full w-full">
      <ActivitiesDeckView
        siteName={siteName}
        domain={domain}
        commanderName={commanderName}
        commanderRole={userContext.role ?? null}
        commanderAvatarUrl={commanderAvatarUrl}
        orbitGroups={orbitGroups}
        countsByModule={payload.countsByModule}
        totalActivities={payload.total}
        enableModuleOpen={true}
      />
    </div>
  );
}
