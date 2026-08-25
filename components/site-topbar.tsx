"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/hooks/use-logout";
import { useUserContext } from "@/hooks/use-user-context";
import { getUserDisplayName } from "@/lib/user-display-name";
import { useT } from "@/components/i18n/i18n-provider";
import { ViewSwitcher } from "@/components/personale/view-switcher";

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

export function SiteTopbar({
  siteName,
  personalManagerEnabled = false,
}: {
  siteName: string;
  /** Mostra lo switcher Personale ⇄ Spazi solo se la capability e' attiva. */
  personalManagerEnabled?: boolean;
}) {
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

  const displayName = useMemo(
    () => getUserDisplayName(userContext),
    [userContext]
  );

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-[hsl(var(--page)/0.96)] px-3 backdrop-blur supports-backdrop-filter:bg-[hsl(var(--page)/0.82)] md:h-12 md:px-4">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <SidebarTrigger className="h-11 w-11 rounded-xl md:h-8 md:w-8" />
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="truncate font-semibold text-foreground">{sectionLabel}</span>
          <span className="hidden text-muted-foreground sm:inline">/</span>
          <span className="hidden truncate text-muted-foreground sm:inline">{siteName}</span>
          {displayName && (
            <>
              <span className="hidden text-muted-foreground md:inline">·</span>
              <span className="hidden truncate font-medium text-foreground md:inline">{displayName}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        {personalManagerEnabled && (
          <ViewSwitcher current="spazi" lastSpaceHref={pathname} />
        )}
        <span className="hidden text-xs font-medium text-muted-foreground md:block">
          {t("topbar.brand")}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          aria-label={t("topbar.exit")}
          className="h-11 gap-2 px-3 text-muted-foreground hover:text-foreground md:h-8 md:px-2"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{t("topbar.logout")}</span>
        </Button>
      </div>
    </header>
  );
}
