/**
 * Site sidebar navigation — single typed source of truth.
 *
 * Commit 1 (raggruppamento): labels of existing items stay as they are;
 * only placement changes. Routes under `app/` are not moved.
 *
 * Role hook (`minRole` on groups):
 * - Existing `UserRole` is `user | admin | superadmin` (no "collaboratore"
 *   / "direttore"). `user` is treated as collaborator, `admin`/`superadmin`
 *   as space director.
 * - Groups without `minRole` are visible to every role.
 * - `minRole: "admin"` hides Listino e prezzi and Configurazione from `user`.
 * - Anagrafiche stays visible: collaborators need Clienti (and related
 *   records) for daily work.
 *
 * Items intentionally left out of the 6-area tree (URL + footer still work):
 * Ore, Errori, Reports, Fabbrica, Treemap, Area Collaboratore,
 * Categorie → Produttori.
 */

import type { Translator } from "@/lib/i18n";
import { PROJECT_PRODUCT_CATEGORIES } from "@/lib/project-categories";

export type NavMinRole = "user" | "admin" | "superadmin";

export type NavIconName =
  | "faWaveSquare"
  | "faTable"
  | "faClock"
  | "faUser"
  | "faExclamation"
  | "faSquarePollVertical"
  | "faCheckSquare"
  | "faBox"
  | "faHelmetSafety"
  | "faUsers"
  | "faWrench"
  | "faPlus"
  | "faBuilding"
  | "faTruckField"
  | "faUserTie"
  | "faWarehouse"
  | "faCalendarDays"
  | "faCalendarCheck"
  | "faBriefcase"
  | "faIndustry"
  | "faListUl";

export type NavItemDef = {
  key: string;
  /** i18n key, e.g. `nav.overview`. Ignored when `label` is set. */
  labelKey?: string;
  /** Hardcoded label (Supplementi, Coefficienti). */
  label?: string;
  /** Path relative to `/sites/{domain}`, or `SETTINGS_HREF_TOKEN`. */
  href?: string;
  icon: NavIconName;
  lucideIcon?: string;
  children?: NavItemDef[];
  moduleName?: string;
  alternativeModules?: string[];
};

export type NavGroupId =
  | "panoramica"
  | "lavoro"
  | "pianificazione"
  | "anagrafiche"
  | "listino"
  | "configurazione";

export type NavGroupDef = {
  id: NavGroupId;
  labelKey: string;
  items: NavItemDef[];
  minRole?: NavMinRole;
};

export type ResolvedNavItem = {
  key: string;
  label: string;
  icon: NavIconName;
  href?: string;
  lucideIcon?: string;
  children?: ResolvedNavItem[];
};

export type ResolvedNavGroup = {
  id: NavGroupId;
  label: string;
  items: ResolvedNavItem[];
};

export const SETTINGS_HREF_TOKEN = "__settings__";

const ROLE_RANK: Record<NavMinRole, number> = {
  user: 1,
  admin: 2,
  superadmin: 3,
};

export const SITE_NAV_GROUPS: NavGroupDef[] = [
  {
    id: "panoramica",
    labelKey: "nav.groupPanoramica",
    items: [
      {
        key: "overview",
        labelKey: "nav.overview",
        href: "/dashboard",
        icon: "faWaveSquare",
        moduleName: "dashboard",
      },
      {
        key: "forecast",
        labelKey: "nav.forecast",
        href: "/dashboard/forecast",
        icon: "faSquarePollVertical",
        moduleName: "dashboard-forecast",
      },
    ],
  },
  {
    id: "lavoro",
    labelKey: "nav.groupLavoro",
    items: [
      {
        key: "projects",
        labelKey: "nav.projects",
        href: "/projects",
        icon: "faTable",
        moduleName: "projects",
        children: PROJECT_PRODUCT_CATEGORIES.map((category) => ({
          key: `projects-${category.slug}`,
          labelKey: category.labelKey,
          href: `/projects?category=${category.slug}`,
          icon: "faTable" as const,
          lucideIcon: category.lucideIcon,
          moduleName: "projects",
        })),
      },
      {
        key: "kanban",
        labelKey: "nav.kanban",
        icon: "faTable",
        moduleName: "kanban",
        children: [],
      },
      {
        key: "documents",
        labelKey: "nav.documents",
        href: "/documenti",
        icon: "faBriefcase",
        moduleName: "projects",
      },
    ],
  },
  {
    id: "pianificazione",
    labelKey: "nav.groupPianificazione",
    items: [
      {
        key: "calendars",
        labelKey: "nav.calendars",
        icon: "faCalendarDays",
        children: [
          {
            key: "calendar-production",
            labelKey: "nav.calendarProduction",
            href: "/calendar",
            icon: "faCalendarCheck",
            moduleName: "calendar",
          },
          {
            key: "calendar-installation",
            labelKey: "nav.calendarInstallation",
            href: "/calendar-installation",
            icon: "faCalendarDays",
            moduleName: "calendar",
          },
          {
            key: "calendar-service",
            labelKey: "nav.calendarService",
            href: "/calendar-service",
            icon: "faCalendarDays",
            moduleName: "calendar",
          },
        ],
      },
      {
        key: "attendance",
        labelKey: "nav.attendance",
        href: "/attendance",
        icon: "faCalendarCheck",
        moduleName: "attendance",
      },
    ],
  },
  {
    id: "anagrafiche",
    labelKey: "nav.groupAnagrafiche",
    items: [
      {
        key: "contacts",
        labelKey: "nav.contacts",
        icon: "faUsers",
        children: [
          {
            key: "clients",
            labelKey: "nav.clients",
            href: "/clients",
            icon: "faUser",
            moduleName: "clients",
          },
          {
            key: "suppliers",
            labelKey: "nav.suppliers",
            href: "/suppliers",
            icon: "faHelmetSafety",
            moduleName: "suppliers",
          },
          {
            key: "manufacturers",
            labelKey: "nav.manufacturers",
            href: "/manufacturers",
            icon: "faIndustry",
            moduleName: "manufacturers",
          },
          {
            key: "resellers",
            labelKey: "nav.resellers",
            href: "/resellers",
            icon: "faTruckField",
            moduleName: "resellers",
          },
          {
            key: "collaborators",
            labelKey: "nav.collaborators",
            href: "/collaborators",
            icon: "faUserTie",
            moduleName: "collaborators",
          },
        ],
      },
      {
        key: "products",
        labelKey: "nav.products",
        href: "/products",
        icon: "faBox",
        moduleName: "products",
      },
      {
        key: "warehouse",
        labelKey: "nav.warehouse",
        href: "/inventory",
        icon: "faWarehouse",
        moduleName: "inventory",
      },
    ],
  },
  {
    id: "listino",
    labelKey: "nav.groupListino",
    minRole: "admin",
    items: [
      {
        key: "supplementi",
        label: "Supplementi",
        href: "/supplementi",
        icon: "faListUl",
        lucideIcon: "Layers",
        moduleName: "products",
      },
      {
        key: "coefficienti",
        label: "Coefficienti",
        href: "/coefficienti",
        icon: "faListUl",
        lucideIcon: "Ruler",
        moduleName: "products",
      },
    ],
  },
  {
    id: "configurazione",
    labelKey: "nav.groupConfigurazione",
    minRole: "admin",
    items: [
      {
        key: "categories",
        labelKey: "nav.categories",
        icon: "faListUl",
        children: [
          {
            key: "categories-inventory",
            labelKey: "nav.categoriesInventory",
            href: "/categories",
            icon: "faListUl",
            moduleName: "categories",
          },
          {
            key: "categories-products",
            labelKey: "nav.categoriesProducts",
            href: "/product-categories",
            icon: "faListUl",
            moduleName: "products",
          },
          {
            key: "categories-suppliers",
            labelKey: "nav.categoriesSuppliers",
            href: "/supplier-categories",
            icon: "faListUl",
            moduleName: "suppliers",
          },
        ],
      },
      {
        key: "settings",
        labelKey: "nav.settings",
        href: SETTINGS_HREF_TOKEN,
        icon: "faWrench",
        lucideIcon: "Settings",
      },
    ],
  },
];

export function roleMeetsMin(
  role: NavMinRole | undefined,
  minRole?: NavMinRole
): boolean {
  if (!minRole || minRole === "user") return true;
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

function isModuleEnabled(
  enabledModules: string[],
  moduleName?: string,
  alternativeModules?: string[]
): boolean {
  if (!moduleName && !alternativeModules?.length) return true;
  if (moduleName && enabledModules.includes(moduleName)) return true;
  return Boolean(
    alternativeModules?.some((name) => enabledModules.includes(name))
  );
}

function filterItemByModules(
  item: NavItemDef,
  enabledModules: string[]
): NavItemDef | null {
  if (item.children && item.children.length > 0) {
    const children = item.children
      .map((child) => filterItemByModules(child, enabledModules))
      .filter((child): child is NavItemDef => child !== null);

    if (children.length > 0) {
      return { ...item, children };
    }

    const parentEnabled = isModuleEnabled(
      enabledModules,
      item.moduleName,
      item.alternativeModules
    );
    if (parentEnabled && item.href) {
      const { children: _removed, ...rest } = item;
      return rest;
    }
    return null;
  }

  // Kanban boards are injected at runtime; keep the parent if the module is on.
  if (item.key === "kanban") {
    return isModuleEnabled(
      enabledModules,
      item.moduleName,
      item.alternativeModules
    )
      ? item
      : null;
  }

  return isModuleEnabled(
    enabledModules,
    item.moduleName,
    item.alternativeModules
  )
    ? item
    : null;
}

function resolveLabel(
  item: NavItemDef,
  t: Translator,
  navLabels: { kanban?: string; projects?: string }
): string {
  if (item.key === "kanban" && navLabels.kanban) return navLabels.kanban;
  if (item.key === "projects" && navLabels.projects) return navLabels.projects;
  if (item.label) return item.label;
  if (item.labelKey) return t(item.labelKey);
  return item.key;
}

function resolveItem(
  item: NavItemDef,
  basePath: string,
  t: Translator,
  navLabels: { kanban?: string; projects?: string },
  settingsHref: string | null
): ResolvedNavItem | null {
  let href: string | undefined;
  if (item.href === SETTINGS_HREF_TOKEN) {
    href = settingsHref ?? undefined;
    if (!href) return null;
  } else if (item.href !== undefined) {
    href = `${basePath}${item.href}`;
  }

  return {
    key: item.key,
    label: resolveLabel(item, t, navLabels),
    icon: item.icon,
    lucideIcon: item.lucideIcon,
    href,
    children: item.children
      ?.map((child) =>
        resolveItem(child, basePath, t, navLabels, settingsHref)
      )
      .filter((child): child is ResolvedNavItem => child !== null),
  };
}

export type BuildSiteNavigationOptions = {
  basePath: string;
  enabledModules: string[];
  role?: NavMinRole;
  t: Translator;
  navLabels?: { kanban?: string; projects?: string };
  settingsHref?: string | null;
  /** Matris keeps Overview Connector as an extra first item under Panoramica. */
  includeMatrisHome?: boolean;
};

export function buildSiteNavigation({
  basePath,
  enabledModules,
  role,
  t,
  navLabels = {},
  settingsHref = null,
  includeMatrisHome = false,
}: BuildSiteNavigationOptions): ResolvedNavGroup[] {
  return SITE_NAV_GROUPS.flatMap((group) => {
    if (!roleMeetsMin(role, group.minRole)) return [];

    const filtered = group.items
      .map((item) => filterItemByModules(item, enabledModules))
      .filter((item): item is NavItemDef => item !== null);

    if (filtered.length === 0) return [];

    const withMatris: NavItemDef[] =
      group.id === "panoramica" && includeMatrisHome
        ? [
            {
              key: "overview-connector",
              label: "Overview Connector",
              href: "",
              icon: "faWaveSquare",
              moduleName: "dashboard",
            },
            ...filtered,
          ]
        : filtered;

    const items = withMatris
      .map((item) =>
        resolveItem(item, basePath, t, navLabels, settingsHref)
      )
      .filter((item): item is ResolvedNavItem => item !== null);

    if (items.length === 0) return [];

    return [
      {
        id: group.id,
        label: t(group.labelKey),
        items,
      },
    ];
  });
}

export function isNavPathActive(
  href: string,
  pathname: string,
  search: string
): boolean {
  const [hrefPath, hrefQuery] = href.split("?");
  if (pathname !== hrefPath) return false;
  if (!hrefQuery) return true;
  const needed = new URLSearchParams(hrefQuery);
  const current = new URLSearchParams(search);
  let matches = true;
  needed.forEach((value, key) => {
    if (current.get(key) !== value) matches = false;
  });
  return matches;
}

export function navItemContainsPath(
  item: Pick<ResolvedNavItem, "href" | "children">,
  pathname: string,
  search: string
): boolean {
  if (item.href && isNavPathActive(item.href, pathname, search)) return true;
  return (
    item.children?.some((child) =>
      navItemContainsPath(child, pathname, search)
    ) ?? false
  );
}

/** Group id plus nested item keys that contain the current path. */
export function collectOpenKeysForActivePath(
  groups: ResolvedNavGroup[],
  pathname: string,
  search: string
): string[] {
  const keys: string[] = [];

  const walk = (item: ResolvedNavItem): boolean => {
    const childHit = item.children?.some(walk) ?? false;
    const selfHit =
      Boolean(item.href && isNavPathActive(item.href, pathname, search)) ||
      childHit;
    if (selfHit && item.children?.length) {
      keys.push(item.key);
    }
    return selfHit;
  };

  for (const group of groups) {
    if (group.items.some(walk)) {
      keys.push(group.id);
    }
  }

  return keys;
}
