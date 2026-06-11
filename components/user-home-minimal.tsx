import { AVAILABLE_MODULES, ModuleConfig } from "@/lib/module-config";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { HomeViewSwitcher } from "@/components/home/HomeViewSwitcher";
import { FlowchartSectionLazy } from "@/components/home/FlowchartSectionLazy";
import {
  StandardModulesView,
  type StandardGroup,
} from "@/components/home/StandardModulesView";
import {
  getFlowchartSelectableModules,
  type SiteFlowchartSettings,
} from "@/lib/flowchart-settings";
import type { WbsLeaf, WbsTree } from "@/lib/wbs-data";

interface UserHomeMinimalProps {
  userName: string;
  domain: string;
  availableModules: string[];
  showDashboard?: boolean;
  flowchartSettings?: SiteFlowchartSettings;
  wbsTree?: WbsTree;
  /** Forces a home view (preview), bypassing the saved user preference. */
  forcedView?: "diagram" | "standard";
}

const categoryLabels: Record<string, string> = {
  core: "Principale",
  management: "Gestione",
  tools: "Strumenti",
  reports: "Report",
};

const categoryOrder = ["core", "management", "tools", "reports"];

export function UserHomeMinimal({
  userName,
  domain,
  availableModules,
  showDashboard = false,
  flowchartSettings,
  wbsTree,
  forcedView,
}: UserHomeMinimalProps) {
  const diagramEnabled = flowchartSettings?.enabled === true;

  // Modules the user can access on the home.
  let visibleModules: ModuleConfig[] = AVAILABLE_MODULES.filter(
    (module) =>
      availableModules.includes(module.name) &&
      module.href &&
      (showDashboard || module.name !== "dashboard")
  );

  // When the diagram view is enabled, the standard view mirrors the diagram:
  // same selectable set (no reports/dashboards) and same admin selection.
  if (diagramEnabled) {
    const selectableNames = new Set(
      getFlowchartSelectableModules().map((module) => module.name)
    );
    const selected = flowchartSettings?.modules;
    visibleModules = visibleModules.filter(
      (module) =>
        selectableNames.has(module.name) &&
        (!selected || selected.includes(module.name))
    );
  }

  // Group modules by category, in the same order used by the diagram.
  const groups: StandardGroup[] = categoryOrder
    .map((category) => ({
      category,
      label: categoryLabels[category] || category,
      modules: visibleModules
        .filter((module) => (module.category || "other") === category)
        .map((module) => ({
          name: module.name,
          label: module.label,
          description: module.description,
          icon: module.icon,
          href: module.href,
        })),
    }))
    .filter((group) => group.modules.length > 0);

  const showTimetrackingAction = visibleModules.some(
    (module) => module.name === "timetracking"
  );

  // Level-3 content per module (shared with the WBS diagram) powering the
  // drill-down sub-view of the standard cards.
  const moduleItems: Record<string, WbsLeaf[]> = {};
  if (wbsTree) {
    for (const category of wbsTree.categories) {
      for (const moduleNode of category.modules) {
        moduleItems[moduleNode.name] = moduleNode.items;
      }
    }
  }

  const standardContent = (
    <StandardModulesView
      domain={domain}
      groups={groups}
      moduleItems={moduleItems}
      showTimetrackingAction={showTimetrackingAction}
    />
  );

  return (
    <PageLayout>
      <PageHeader>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Benvenuto{userName ? `, ${userName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Accedi rapidamente ai tuoi moduli disponibili
          </p>
        </div>
      </PageHeader>
      <PageContent>
        {diagramEnabled && flowchartSettings ? (
          <HomeViewSwitcher
            domain={domain}
            forcedView={forcedView}
            standard={standardContent}
            diagram={
              <div className="h-[calc(100vh-280px)] min-h-[480px]">
                <FlowchartSectionLazy
                  type={flowchartSettings.type}
                  domain={domain}
                  tree={wbsTree}
                  nodeStyle={flowchartSettings.nodeStyle}
                />
              </div>
            }
          />
        ) : (
          standardContent
        )}
      </PageContent>
    </PageLayout>
  );
}
