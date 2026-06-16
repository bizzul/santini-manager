import { notFound, redirect } from "next/navigation";
import { getServerSiteContext } from "@/lib/server-data";
import { getUserContext } from "@/lib/auth-utils";
import { canAccessModule, getUserModules } from "@/lib/permissions";
import { AVAILABLE_MODULES } from "@/lib/module-config";
import { UserHomeMinimal } from "@/components/user-home-minimal";
import { getFlowchartSettingsForSite } from "@/lib/flowchart-settings.server";
import {
  mergeFlowchartSettings,
  parseFlowchartDraftFromSearchParams,
} from "@/lib/flowchart-settings";
import { getWbsTreeForSite } from "@/lib/wbs-data.server";
import type { WbsTree } from "@/lib/wbs-data";

export const dynamic = "force-dynamic";

export default async function SiteUniversalHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>;
  searchParams: Promise<{
    view?: string;
    preview?: string;
    root?: string;
    nodeStyle?: string;
    type?: string;
    modules?: string;
    kanbanIds?: string;
    kanbanSelection?: string;
  }>;
}) {
  const { domain } = await params;
  const query = await searchParams;
  const { view } = query;
  const forcedView =
    view === "diagram" || view === "standard" ? view : undefined;

  const siteContext = await getServerSiteContext(domain);

  if (!siteContext) {
    notFound();
  }

  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  const userId = userContext.userId || userContext.user.id;
  const userModules = await getUserModules(
    userId,
    siteContext.siteId,
    userContext.role
  );

  const availableModules =
    userModules === "all"
      ? AVAILABLE_MODULES.map((module) => module.name)
      : userModules;

  const [hasDashboardAccess, persistedFlowchartSettings] = await Promise.all([
    canAccessModule(userId, siteContext.siteId, "dashboard", userContext.role),
    getFlowchartSettingsForSite(siteContext.siteId),
  ]);

  const draftOverride = parseFlowchartDraftFromSearchParams(query);
  const flowchartSettings = mergeFlowchartSettings(
    persistedFlowchartSettings,
    draftOverride,
  );

  const userName =
    userContext.user?.user_metadata?.given_name ||
    userContext.user?.user_metadata?.full_name?.split(" ")[0] ||
    "";

  let wbsTree: WbsTree | undefined;
  if (flowchartSettings.enabled && flowchartSettings.type === "wbs") {
    const siteName = siteContext.siteData?.name || domain;
    const userFullName =
      userContext.user?.user_metadata?.full_name ||
      userName ||
      userContext.user?.email ||
      "Utente";

    wbsTree = await getWbsTreeForSite({
      siteId: siteContext.siteId,
      scope: flowchartSettings.root,
      rootLabel: flowchartSettings.root === "user" ? userFullName : siteName,
      rootSublabel:
        flowchartSettings.root === "user" ? siteName : "Vista completa",
      userModuleNames: availableModules,
      selectedModules: flowchartSettings.modules,
      kanbanSelection: flowchartSettings.kanbanSelection,
      selectedKanbanIds: flowchartSettings.kanbanIds,
    });
  }

  return (
    <UserHomeMinimal
      userName={userName}
      domain={domain}
      siteId={siteContext.siteId}
      availableModules={availableModules}
      showDashboard={hasDashboardAccess}
      flowchartSettings={flowchartSettings}
      wbsTree={wbsTree}
      forcedView={forcedView}
    />
  );
}
