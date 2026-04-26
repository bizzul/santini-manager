"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSiteModules } from "@/hooks/use-site-modules";
import {
  DEFAULT_SITE_VERTICAL_PROFILE,
  resolveSiteVerticalProfile,
} from "@/lib/site-verticals";
import {
  LayoutDashboard,
  BrainCircuit,
  ShoppingCart,
  ClipboardList,
  Factory,
  Receipt,
  Users,
  Box,
  Tag,
} from "lucide-react";

export default function DashboardTabs() {
  const pathname = usePathname();

  // Extract domain and base path from pathname
  const { domain, basePath } = useMemo(() => {
    const match = pathname.match(/\/sites\/([^\/]+)/);
    const domain = match ? match[1] : null;
    const basePath = domain ? `/sites/${domain}/dashboard` : "/dashboard";
    return { domain, basePath };
  }, [pathname]);

  // Extract the current tab from pathname
  const isOverview = pathname.endsWith("/dashboard") || pathname.endsWith("/dashboard/");
  const currentPath = pathname.replace(/^.*\/dashboard/, "") || "";
  const { data: verticalProfile = DEFAULT_SITE_VERTICAL_PROFILE } = useQuery({
    queryKey: ["dashboard-vertical-profile", domain],
    enabled: !!domain,
    queryFn: async () => {
      const response = await fetch(`/api/sites/${domain}`);
      if (!response.ok) {
        return DEFAULT_SITE_VERTICAL_PROFILE;
      }

      const data = await response.json();
      return resolveSiteVerticalProfile(data.verticalProfile);
    },
  });
  const { enabledModules, loading: loadingModules } = useSiteModules(domain || "");
  const showForecastTab = useMemo(() => {
    if (!domain || loadingModules) return true;
    return enabledModules.some((module) => module.name === "dashboard-forecast");
  }, [domain, loadingModules, enabledModules]);
  const tabs = useMemo(
    () =>
      [
        { name: verticalProfile.dashboardTabs.overview, href: "", icon: LayoutDashboard },
        showForecastTab ? { name: "Forecast", href: "/forecast", icon: BrainCircuit } : null,
        { name: verticalProfile.dashboardTabs.vendita, href: "/vendita", icon: ShoppingCart },
        { name: "AVOR", href: "/avor", icon: ClipboardList },
        { name: verticalProfile.dashboardTabs.produzione, href: "/produzione", icon: Factory },
        { name: "Fatturazione", href: "/fatturazione", icon: Receipt },
        { name: "Interni", href: "/interni", icon: Users },
        { name: verticalProfile.dashboardTabs.inventario, href: "/inventario", icon: Box },
        { name: verticalProfile.dashboardTabs.prodotti, href: "/prodotti", icon: Tag },
      ].filter(Boolean) as Array<{
        name: string;
        href: string;
        icon: typeof LayoutDashboard;
      }>,
    [verticalProfile, showForecastTab]
  );

  return (
    <div className="sticky top-0 z-10 border-b border-slate-600/70 bg-slate-950/90 backdrop-blur supports-[backdrop-filter]:bg-slate-950/75">
      <div className="flex items-center gap-4 px-4 py-3 md:px-6 lg:px-8">
        <div className="dashboard-panel-inner flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto p-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-track]:bg-transparent">
          {tabs.map((tab) => {
            const tabPath = tab.href || "";
            const isActive =
              (tab.href === "" && isOverview) ||
              (!isOverview && currentPath === tabPath);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.name}
                href={`${basePath}${tabPath}`}
                className={cn(
                  "flex h-9 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                  isActive
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
