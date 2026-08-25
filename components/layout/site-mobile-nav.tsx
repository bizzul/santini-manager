"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, FolderOpen, Home, Menu, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { useMediaCapture } from "@/components/media/media-capture-context";
import { extractDomainFromPath } from "@/lib/media/resolve-media-target";
import { useT } from "@/components/i18n/i18n-provider";

/**
 * Persistent mobile navigation for the Full Data Manager site shell.
 * Hidden from `md` up so the desktop sidebar is unchanged.
 */
export function SiteMobileNav() {
  const pathname = usePathname() ?? "";
  const domain = extractDomainFromPath(pathname);
  const base = domain ? `/sites/${domain}` : "";
  const { setOpenMobile } = useSidebar();
  const { setSheetOpen } = useMediaCapture();
  const t = useT();

  if (!base) return null;

  const tabs = [
    {
      key: "home",
      href: `${base}/dashboard`,
      label: t("mobile.navHome"),
      icon: Home,
      match: (path: string) =>
        path === base ||
        path === `${base}/` ||
        path.startsWith(`${base}/dashboard`),
    },
    {
      key: "work",
      href: `${base}/projects`,
      label: t("mobile.navWork"),
      icon: Briefcase,
      match: (path: string) =>
        path.startsWith(`${base}/projects`) ||
        path.startsWith(`${base}/kanban`) ||
        path.startsWith(`${base}/documenti`),
    },
    {
      key: "records",
      href: `${base}/clients`,
      label: t("mobile.navRecords"),
      icon: FolderOpen,
      match: (path: string) =>
        path.startsWith(`${base}/clients`) ||
        path.startsWith(`${base}/suppliers`) ||
        path.startsWith(`${base}/products`) ||
        path.startsWith(`${base}/inventory`),
    },
  ] as const;

  return (
    <nav
      aria-label={t("mobile.navLabel")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="grid grid-cols-5">
        {tabs.slice(0, 2).map((tab) => {
          const Icon = tab.icon;
          const active = tab.match(pathname);
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}

        <li className="-mt-4 flex flex-col items-center justify-end">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-primary text-primary-foreground shadow-lg"
            aria-label={t("mobile.addMedia")}
          >
            <Camera className="h-6 w-6" />
          </button>
          <span className="mt-0.5 max-w-[4.5rem] truncate text-[10px] font-medium text-primary">
            Foto
          </span>
        </li>

        {tabs.slice(2).map((tab) => {
          const Icon = tab.icon;
          const active = tab.match(pathname);
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
            <span>{t("mobile.navMenu")}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
