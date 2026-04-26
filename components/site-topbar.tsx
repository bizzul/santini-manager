"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";

const ROUTE_LABELS: Array<[string, string]> = [
  ["/dashboard", "Dashboard"],
  ["/kanban", "Kanban"],
  ["/calendar", "Calendari"],
  ["/attendance", "Presenze"],
  ["/clients", "Clienti"],
  ["/suppliers", "Fornitori"],
  ["/inventory", "Magazzino"],
  ["/factory", "Fabbrica"],
  ["/products", "Prodotti"],
  ["/projects", "Progetti"],
  ["/reports", "Reports"],
  ["/errortracking", "Errori"],
  ["/timetracking", "Ore"],
  ["/command-deck", "Command Deck"],
];

export function SiteTopbar({ siteName }: { siteName: string }) {
  const pathname = usePathname();
  const sectionLabel = useMemo(() => {
    const match = ROUTE_LABELS.find(([segment]) => pathname.includes(segment));
    return match?.[1] || "Spazio operativo";
  }, [pathname]);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-600/70 bg-[hsl(var(--page)/0.96)] px-4 backdrop-blur supports-backdrop-filter:bg-[hsl(var(--page)/0.82)]">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="-ml-1 h-8 w-8 rounded-xl" />
        <div className="hidden min-w-0 items-center gap-2 text-sm sm:flex">
          <span className="truncate font-semibold text-foreground">{sectionLabel}</span>
          <span className="text-muted-foreground">/</span>
          <span className="truncate text-muted-foreground">{siteName}</span>
        </div>
      </div>
      <div className="hidden text-xs font-medium text-muted-foreground md:block">
        Full Data Manager
      </div>
    </header>
  );
}
