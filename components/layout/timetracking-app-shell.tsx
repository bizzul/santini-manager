"use client";

import Link from "next/link";
import { LogOut, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/hooks/use-logout";
import { useT } from "@/components/i18n/i18n-provider";

/**
 * Minimal chrome for the "ore only" PWA home: time tracking, no sidebar
 * or bottom manager navigation.
 */
export function TimetrackingAppShell({
  siteName,
  children,
}: {
  siteName: string;
  children: React.ReactNode;
}) {
  const { logout } = useLogout();
  const t = useT();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[hsl(var(--page))]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-[hsl(var(--page)/0.96)] px-3 backdrop-blur md:px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {t("nav.hours")}
          </p>
          <p className="truncate text-xs text-muted-foreground">{siteName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-11 gap-2 px-3 md:h-8"
          >
            <Link href="/pwa/home">
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">{t("pwa.changeView")}</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            aria-label={t("topbar.exit")}
            className="h-11 gap-2 px-3 text-muted-foreground hover:text-foreground md:h-8"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t("topbar.logout")}</span>
          </Button>
        </div>
      </header>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
