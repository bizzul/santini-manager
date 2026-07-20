"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Receipt,
  Map as MapIcon,
  CalendarDays,
  Truck,
} from "lucide-react";

const TABS = [
  { name: "Home", href: "", icon: LayoutDashboard },
  { name: "Vendita", href: "/vendita", icon: ShoppingCart },
  { name: "Plan", href: "/plan", icon: ClipboardList },
  { name: "Accounting", href: "/accounting", icon: Receipt },
  { name: "Fornitori", href: "/fornitori", icon: Truck },
  { name: "Calendario", href: "/calendario", icon: CalendarDays },
  { name: "Mappa", href: "/mappa", icon: MapIcon },
];

export default function MomentumTabs() {
  const pathname = usePathname();

  const { basePath, current } = useMemo(() => {
    const match = pathname.match(/\/sites\/([^/]+)/);
    const domain = match ? match[1] : null;
    const base = domain ? `/sites/${domain}/momentum` : "/momentum";
    const rest = pathname.replace(/^.*\/momentum/, "") || "";
    return { basePath: base, current: rest };
  }, [pathname]);

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border bg-card/60 p-1">
      {TABS.map((tab) => {
        const isActive =
          (tab.href === "" && (current === "" || current === "/")) ||
          (tab.href !== "" && current.startsWith(tab.href));
        const Icon = tab.icon;
        return (
          <Link
            key={tab.name}
            href={`${basePath}${tab.href}`}
            className={cn(
              "flex h-9 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
