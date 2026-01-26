"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Factory,
  Receipt,
  Users,
  Box,
  Tag,
} from "lucide-react";
import PeriodFilters from "./PeriodFilters";

const tabs = [
  { name: "Overview", href: "", icon: LayoutDashboard },
  { name: "Vendita", href: "/vendita", icon: ShoppingCart },
  { name: "AVOR", href: "/avor", icon: ClipboardList },
  { name: "Produzione", href: "/produzione", icon: Factory },
  { name: "Fatturazione", href: "/fatturazione", icon: Receipt },
  { name: "Interni", href: "/interni", icon: Users },
  { name: "Inventario", href: "/inventario", icon: Box },
  { name: "Prodotti", href: "/prodotti", icon: Tag },
];

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

  return (
    <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 border-b border-slate-800">
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-800 [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded">
          {tabs.map((tab) => {
            const tabPath = tab.href || "";
            const isActive =
              (tab.name === "Overview" && isOverview) ||
              (!isOverview && currentPath === tabPath);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.name}
                href={`${basePath}${tabPath}`}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 flex-shrink-0",
                  isActive
                    ? "bg-blue-500 text-white"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </div>
        <div className="flex-shrink-0 ml-4">
          <PeriodFilters />
        </div>
      </div>
    </div>
  );
}
