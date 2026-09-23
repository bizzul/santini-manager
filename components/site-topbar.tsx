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

// Maps a path segment to a translation key in the `nav` namespace, or to a
// literal label when the sidebar uses a hardcoded one (Supplementi,
// Coefficienti, Treemap). More specific segments first: matching is `includes`.
const ROUTE_LABELS: Array<[string, { key: string } | { label: string }]> = [
  ["/dashboard", { key: "nav.dashboard" }],
  ["/kanban", { key: "nav.kanban" }],
  ["/documenti", { key: "nav.documents" }],
  ["/calendar", { key: "nav.calendars" }],
  ["/attendance", { key: "nav.attendance" }],
  ["/product-categories", { key: "nav.categories" }],
  ["/supplier-categories", { key: "nav.categories" }],
  ["/manufacturer-categories", { key: "nav.categories" }],
  ["/categories", { key: "nav.categories" }],
  ["/clients", { key: "nav.clients" }],
  ["/suppliers", { key: "nav.suppliers" }],
  ["/collaborators", { key: "nav.collaborators" }],
  ["/inventory", { key: "nav.warehouse" }],
  ["/factory", { key: "nav.factory" }],
  ["/products", { key: "nav.products" }],
  ["/projects", { key: "nav.projects" }],
  ["/supplementi", { label: "Supplementi" }],
  ["/coefficienti", { label: "Coefficienti" }],
  ["/treemap", { label: "Treemap" }],
  ["/supporto", { key: "nav.support" }],
  ["/reports", { key: "nav.reports" }],
  ["/errortracking", { key: "nav.errors" }],
  ["/timetracking", { key: "nav.hours" }],
  ["/command-deck", { key: "nav.home" }],
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
    const match = ROUTE_LABELS.find(([segment]) =>
      pathname.includes(segment),
    );
    if (!match) return t("topbar.fallbackSection");
    const target = match[1];
    return "key" in target ? t(target.key) : target.label;
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
          <span className="truncate font-semibold text-page-foreground">{sectionLabel}</span>
          <span className="hidden text-page-muted-foreground sm:inline">/</span>
          <span className="hidden truncate text-page-muted-foreground sm:inline">{siteName}</span>
          {displayName && (
            <>
              <span className="hidden text-page-muted-foreground md:inline">·</span>
              <span className="hidden truncate font-medium text-page-foreground md:inline">{displayName}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        {personalManagerEnabled && (
          <ViewSwitcher current="spazi" lastSpaceHref={pathname} />
        )}
        <span className="hidden text-xs font-medium text-page-muted-foreground md:block">
          {t("topbar.brand")}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          aria-label={t("topbar.exit")}
          className="h-11 gap-2 px-3 text-page-muted-foreground hover:text-page-foreground md:h-8 md:px-2"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{t("topbar.logout")}</span>
        </Button>
      </div>
    </header>
  );
}
