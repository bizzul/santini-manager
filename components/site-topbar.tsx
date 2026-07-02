"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/hooks/use-logout";
import { useUserContext } from "@/hooks/use-user-context";
import { useT } from "@/components/i18n/i18n-provider";

// Maps a path segment to a translation key in the `nav` namespace.
const ROUTE_LABEL_KEYS: Array<[string, string]> = [
  ["/dashboard", "nav.dashboard"],
  ["/kanban", "nav.kanban"],
  ["/calendar", "nav.calendars"],
  ["/attendance", "nav.attendance"],
  ["/clients", "nav.clients"],
  ["/suppliers", "nav.suppliers"],
  ["/inventory", "nav.warehouse"],
  ["/factory", "nav.factory"],
  ["/products", "nav.products"],
  ["/projects", "nav.projects"],
  ["/reports", "nav.reports"],
  ["/errortracking", "nav.errors"],
  ["/timetracking", "nav.hours"],
  ["/command-deck", "nav.home"],
];

export function SiteTopbar({ siteName }: { siteName: string }) {
  const pathname = usePathname();
  const { logout } = useLogout();
  const { userContext } = useUserContext();
  const t = useT();
  const sectionLabel = useMemo(() => {
    const match = ROUTE_LABEL_KEYS.find(([segment]) =>
      pathname.includes(segment),
    );
    return match ? t(match[1]) : t("topbar.fallbackSection");
  }, [pathname, t]);

  const displayName = useMemo(() => {
    const profile = userContext?.user?.user_metadata;
    return (
      profile?.full_name ||
      (profile?.name && profile?.last_name
        ? `${profile.name} ${profile.last_name}`
        : userContext?.user?.email || "")
    );
  }, [userContext]);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-600/70 bg-[hsl(var(--page)/0.96)] px-4 backdrop-blur supports-backdrop-filter:bg-[hsl(var(--page)/0.82)]">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="-ml-1 h-8 w-8 rounded-xl" />
        <div className="hidden min-w-0 items-center gap-2 text-sm sm:flex">
          <span className="truncate font-semibold text-foreground">{sectionLabel}</span>
          <span className="text-muted-foreground">/</span>
          <span className="truncate text-muted-foreground">{siteName}</span>
          {displayName && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="truncate font-medium text-foreground">{displayName}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-xs font-medium text-muted-foreground md:block">
          {t("topbar.brand")}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          aria-label={t("topbar.exit")}
          className="h-8 gap-2 px-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{t("topbar.logout")}</span>
        </Button>
      </div>
    </header>
  );
}
