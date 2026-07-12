"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  CalendarCheck,
  Contact,
  Home,
  LayoutDashboard,
  PieChart,
  Settings,
  ShoppingBag,
  SquareKanban,
  Tags,
  UserRound,
  Warehouse,
  Workflow,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const BASE = "/personale";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  exact?: boolean;
}

/**
 * Sotto-voci del Manager Personale: le stesse quattro della bottom-bar
 * mobile (MobileShell). Stessi componenti di destinazione, non duplicati.
 */
const PM_ITEMS: NavItem[] = [
  { label: "Wheel of Life", href: BASE, icon: <PieChart className="h-4 w-4" />, exact: true },
  { label: "Today", href: `${BASE}/today`, icon: <CalendarCheck className="h-4 w-4" /> },
  { label: "Automazioni", href: `${BASE}/automations`, icon: <Workflow className="h-4 w-4" /> },
  { label: "Impostazioni personali", href: `${BASE}/settings`, icon: <Settings className="h-4 w-4" /> },
];

/** Viste aggregate cross-space: il dato della persona, non di uno spazio. */
const AGGREGATE_ITEMS: NavItem[] = [
  { label: "Home", href: BASE, icon: <Home className="h-4 w-4" />, exact: true },
  { label: "Dashboard", href: `${BASE}/dashboard`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Kanban", href: `${BASE}/kanban`, icon: <SquareKanban className="h-4 w-4" /> },
  { label: "Contatti", href: `${BASE}/contatti`, icon: <Contact className="h-4 w-4" /> },
  { label: "Magazzino", href: `${BASE}/magazzino`, icon: <Warehouse className="h-4 w-4" /> },
  { label: "Prodotti", href: `${BASE}/prodotti`, icon: <ShoppingBag className="h-4 w-4" /> },
  { label: "Categorie", href: `${BASE}/categorie`, icon: <Tags className="h-4 w-4" /> },
];

function isActive(item: NavItem, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      {item.icon}
      <span>{item.label}</span>
    </Link>
  );
}

export function PersonaleSidebar({ userName }: { userName: string }) {
  const pathname = usePathname() ?? BASE;
  const inPmSection = PM_ITEMS.some((item) => isActive(item, pathname));

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-3">
        <Boxes className="h-5 w-5 text-sidebar-foreground/70" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">
            {userName}
          </p>
          <p className="text-[11px] text-sidebar-foreground/60">Vista personale</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {/* Manager Personale: prima voce, evidenziata, sfondo pieno. */}
        <div
          className={cn(
            "rounded-xl border p-2",
            inPmSection
              ? "border-sidebar-primary/40 bg-sidebar-primary/15"
              : "border-sidebar-border bg-sidebar-accent/30",
          )}
        >
          <div className="mb-1 flex items-center gap-2 px-2 pt-1">
            <UserRound className="h-4 w-4 text-sidebar-primary" />
            <span className="text-sm font-bold text-sidebar-foreground">
              Manager Personale
            </span>
          </div>
          <div className="space-y-0.5">
            {PM_ITEMS.map((item) => (
              <NavLink
                key={item.label}
                item={item}
                active={isActive(item, pathname)}
              />
            ))}
          </div>
        </div>

        <div className="my-3 border-t border-sidebar-border" />

        <div className="space-y-0.5">
          {AGGREGATE_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              item={item}
              active={
                // "Home" coincide con la wheel: attiva solo su match esatto e
                // solo se non stiamo evidenziando gia' la sezione PM.
                item.exact
                  ? false
                  : isActive(item, pathname)
              }
            />
          ))}
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/sites/select"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <Boxes className="h-4 w-4" />
          I tuoi spazi
        </Link>
      </div>
    </aside>
  );
}
