// Configurazione della navigazione laterale dell'area Administration
// ("Manager dei Manager"). Sostituisce le card della dashboard come
// navigazione persistente. Consumata dalla shell super-admin (Fase 3).

import {
  Building,
  Globe,
  KanbanSquare,
  LayoutDashboard,
  QrCode,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** true = visibile solo al superadmin; false = anche admin di org. */
  superadminOnly: boolean;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/administration",
    icon: LayoutDashboard,
    superadminOnly: false,
  },
  {
    key: "projects",
    label: "Progetti",
    href: "/administration/projects",
    icon: KanbanSquare,
    superadminOnly: true,
  },
  {
    key: "organizations",
    label: "Organizations",
    href: "/administration/organizations",
    icon: Building,
    superadminOnly: false,
  },
  {
    key: "sites",
    label: "Sites",
    href: "/administration/sites",
    icon: Globe,
    superadminOnly: false,
  },
  {
    key: "users",
    label: "Users",
    href: "/administration/users",
    icon: Users,
    superadminOnly: false,
  },
  {
    key: "demos",
    label: "Demo QR",
    href: "/administration/demos",
    icon: QrCode,
    superadminOnly: true,
  },
];

export function getAdminNavItems(isSuperadmin: boolean): AdminNavItem[] {
  return ADMIN_NAV_ITEMS.filter(
    (item) => isSuperadmin || !item.superadminOnly
  );
}
