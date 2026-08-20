"use client";
import React, { useState, useMemo, useCallback, memo, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useUserContext } from "@/hooks/use-user-context";
import { UserContext } from "@/lib/auth-utils";
import { usePathname, useSearchParams } from "next/navigation";
import { NavUser } from "./nav-user";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useKanbanModal } from "@/components/kanbans/KanbanModalContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Kanban } from "../store/kanban-store";
import Link from "next/link";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSiteModules } from "@/hooks/use-site-modules";
import { resolveSiteVerticalProfile } from "@/lib/site-verticals";
import { isCampagnaElettorale } from "@/lib/campagna/config";
import { useT } from "@/components/i18n/i18n-provider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { ChevronDown, Settings } from "lucide-react";
import {
  buildSiteNavigation,
  collectOpenKeysForActivePath,
  isNavPathActive,
  type NavIconName,
  type NavMinRole,
  type ResolvedNavItem,
} from "@/lib/navigation";
import {
  faWaveSquare,
  faTable,
  faClock,
  faUser,
  faExclamation,
  faSquarePollVertical,
  faCheckSquare,
  faBox,
  faHelmetSafety,
  faUsers,
  faWrench,
  faPlus,
  faBuilding,
  faTruckField,
  faUserTie,
  faWarehouse,
  faCalendarDays,
  faCalendarCheck,
  faBriefcase,
  faIndustry,
  faListUl,
} from "@fortawesome/free-solid-svg-icons";
import { QuickActions } from "@/components/quick-actions";
import { CommandDeckLauncher } from "@/components/command-deck/CommandDeckLauncher";
import { getKanbanIcon } from "@/lib/kanban-icons";
import { cn } from "@/lib/utils";

// Sidebar-only display shortening: kanban titles containing "Tantal" are
// abbreviated to "Ta" to keep the labels compact (data stays unchanged).
const formatKanbanTitle = (title: string): string =>
  title.replace(/Tantal/g, "Ta");

// localStorage keys for sidebar state persistence
const SIDEBAR_COLLAPSED_MENUS_KEY = "santini-sidebar-collapsed-nav-v2";
const SIDEBAR_KANBAN_OPENED_KEY = "santini-sidebar-kanban-opened";

const NAV_GROUP_UNBOXED =
  "rounded-none border-0 bg-transparent p-0.5 shadow-none dark:border-0 dark:bg-transparent dark:shadow-none group-data-[collapsible=icon]:rounded-none group-data-[collapsible=icon]:p-0.5";
const NAV_GROUP_FRAME =
  "sidebar-nav-group w-full min-w-0 overflow-hidden rounded-2xl border border-[#3a3f48] bg-white/80 shadow-none dark:bg-white/10 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent";
const NAV_GROUP_FRAME_STYLE: React.CSSProperties = {
  borderColor: "#3a3f48",
  backgroundImage:
    "linear-gradient(155deg, color-mix(in srgb, var(--sidebar-nav-accent) 18%, transparent), color-mix(in srgb, var(--sidebar-nav-accent) 5%, transparent))",
};
const NAV_GROUP_LABEL =
  "flex h-auto w-full cursor-pointer items-center gap-1 bg-transparent py-3 pl-5 pr-3.5 text-left text-[13px] font-bold uppercase leading-none tracking-[0.08em] text-[hsl(var(--sidebar-foreground)/0.72)] outline-none ring-0 hover:bg-transparent hover:text-[hsl(var(--sidebar-foreground)/0.92)] focus-visible:outline-none focus-visible:ring-0 dark:text-white/70 dark:hover:bg-transparent dark:hover:text-white [&>svg]:size-[13px] [&>svg]:shrink-0 [&>svg]:translate-y-px [&>svg]:text-current";
const NAV_CATEGORY_FRAME =
  "sidebar-nav-category mb-2 last:mb-0 block w-full min-w-0 overflow-hidden rounded-[14px] border border-[#3a3f48] bg-white/70 p-1 dark:bg-white/[0.08]";
const NAV_CATEGORY_FRAME_ACTIVE =
  "sidebar-nav-category-active border-[#4b5160] dark:bg-white/[0.14]";
const NAV_CATEGORY_FRAME_STYLE: React.CSSProperties = {
  borderColor: "#3a3f48",
  backgroundImage:
    "linear-gradient(155deg, color-mix(in srgb, var(--sidebar-nav-accent) 22%, transparent), color-mix(in srgb, var(--sidebar-nav-accent) 6%, transparent))",
};
const NAV_CATEGORY_FRAME_ACTIVE_STYLE: React.CSSProperties = {
  borderColor: "#4b5160",
  backgroundImage:
    "linear-gradient(155deg, color-mix(in srgb, var(--sidebar-nav-accent) 36%, transparent), color-mix(in srgb, var(--sidebar-nav-accent) 12%, transparent))",
};
const NAV_SUBTREE =
  "sidebar-nav-subtree ml-1 mr-1 mb-1 translate-x-0 rounded-b-[10px] border-0 border-l-2 border-[var(--sidebar-nav-accent)] bg-black/[0.06] py-1 pl-2.5 pr-1 dark:bg-black/25";
const NAV_KANBAN_LIST =
  "sidebar-nav-kanban-list ml-1 mr-0 translate-x-0 py-0 pl-2 gap-0";
const NAV_CATEGORY_ITEMS =
  "sidebar-nav-category-items ml-1 mr-1 mb-1 translate-x-0 rounded-b-[10px] border-0 border-l-2 border-[var(--sidebar-nav-accent)] bg-black/[0.06] py-1 pl-2.5 pr-1 dark:bg-black/25";

// Helper function to get initial collapsed menus state from localStorage.
// Default is open (key absent or false). `true` means the user collapsed it.
const getInitialCollapsedMenus = (): Record<string, boolean> => {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_MENUS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return {};
};

// Helper function to get initial kanban opened state from localStorage
const getInitialKanbanOpened = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(SIDEBAR_KANBAN_OPENED_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return false;
};

// Icon mapping for sidebar
const iconMap: Record<NavIconName, IconDefinition> = {
  faWaveSquare,
  faTable,
  faClock,
  faUser,
  faExclamation,
  faSquarePollVertical,
  faCheckSquare,
  faBox,
  faHelmetSafety,
  faUsers,
  faWrench,
  faPlus,
  faBuilding,
  faTruckField,
  faUserTie,
  faWarehouse,
  faCalendarDays,
  faCalendarCheck,
  faBriefcase,
  faIndustry,
  faListUl,
};

type SiteDataQueryResult = {
  id: string;
  name: string;
  logo: string | null;
  image: string | null;
  verticalProfile?: unknown;
  organization: { name: string };
  /** Per-site Command Deck toggle, persisted in `site_settings`. */
  commandDeckEnabled?: boolean;
  /** 'azienda' (default) | 'campagna_elettorale'. Drives the campaign menu. */
  siteType?: string;
};

// Fetch functions for React Query
async function fetchSiteData(domain: string): Promise<SiteDataQueryResult> {
  const response = await fetch(`/api/sites/${domain}`);
  if (!response.ok) throw new Error("Failed to fetch site data");
  const data = await response.json();
  return {
    id: data.id,
    name: data.name || domain,
    logo: data.logo || null,
    image: data.image || null,
    verticalProfile: data.verticalProfile || null,
    organization: { name: data.organization?.name || "" },
    commandDeckEnabled: Boolean(data.commandDeckEnabled),
    siteType: data.site_type || "azienda",
  };
}

async function fetchKanbans(domain: string): Promise<Kanban[]> {
  const response = await fetch(
    `/api/kanban/list?domain=${encodeURIComponent(domain)}`,
    { headers: { host: domain } }
  );
  if (!response.ok) throw new Error("Failed to fetch kanbans");
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function fetchKanbanCategories(domain: string) {
  const response = await fetch(
    `/api/kanban/categories?domain=${encodeURIComponent(domain)}`,
    { headers: { host: domain } }
  );
  if (!response.ok) throw new Error("Failed to fetch kanban categories");
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

type MenuItem = {
  /** Stable identity for grouping/collapse, independent from the (translated) label. */
  key?: string;
  label: string;
  icon: NavIconName;
  href?: string;
  action?: () => void;
  alert: boolean;
  items?: MenuItem[];
  customComponent?: React.ReactNode;
  moduleName?: string;
  alternativeModules?: string[]; // Alternative module names that also enable this menu
  id?: string | number; // Add unique identifier for kanban items
  lucideIcon?: string; // Lucide icon name for kanban categories
  color?: string; // Color for category icons
  logoSrc?: string; // Optional logo image shown instead of the FontAwesome icon
};

function toMenuItem(item: ResolvedNavItem): MenuItem {
  return {
    key: item.key,
    label: item.label,
    icon: item.icon,
    href: item.href,
    lucideIcon: item.lucideIcon,
    alert: false,
    items: item.children?.map(toMenuItem),
  };
}

function menuItemContainsPath(
  item: MenuItem,
  pathname: string,
  search: string
): boolean {
  if (item.href && isNavPathActive(item.href, pathname, search)) return true;
  return (
    item.items?.some((child) => menuItemContainsPath(child, pathname, search)) ??
    false
  );
}

// Optimized domain extraction function
const extractDomainFromPath = (pathname: string): string | null => {
  const match = pathname.match(/\/sites\/([^\/]+)/);
  return match ? match[1] : null;
};


const UserSection = memo(function UserSection({
  user,
  domain,
}: {
  user: UserContext;
  domain?: string;
}) {
  return <NavUser user={user} domain={domain} />;
});

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state } = useSidebar();
  const { userContext } = useUserContext();
  const { openCreateModal } = useKanbanModal();
  const t = useT();
  const { isOnline } = useOnlineStatus();
  // Server-safe defaults: localStorage is read only after mount, so the
  // first client render matches the SSR HTML (avoids hydration mismatch).
  const [collapsedMenus, setCollapsedMenus] = useState<Record<string, boolean>>(
    {}
  );
  const queryClient = useQueryClient();
  const [isHydrated, setIsHydrated] = useState(false);

  // Track if Kanban section has been opened at least once (for lazy loading)
  const [kanbanOpened, setKanbanOpened] = useState(false);

  // Restore persisted sidebar state from localStorage after mount.
  useEffect(() => {
    setCollapsedMenus(getInitialCollapsedMenus());
    setKanbanOpened(getInitialKanbanOpened());
    setIsHydrated(true);
  }, []);

  // Persist collapsed menus state to localStorage (only after the initial
  // restore, to avoid overwriting the stored value with the defaults).
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(
        SIDEBAR_COLLAPSED_MENUS_KEY,
        JSON.stringify(collapsedMenus)
      );
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [collapsedMenus, isHydrated]);

  // Persist kanban opened state to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(
        SIDEBAR_KANBAN_OPENED_KEY,
        JSON.stringify(kanbanOpened)
      );
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [kanbanOpened, isHydrated]);

  // Optimized domain extraction
  const domain = useMemo(() => extractDomainFromPath(pathname), [pathname]);
  const basePath = useMemo(() => (domain ? `/sites/${domain}` : ""), [domain]);

  // Enhanced site modules hook usage (already uses React Query)
  const { enabledModules, loading: loadingModules } = useSiteModules(
    domain || ""
  );

  // OPTIMIZED: Use React Query for site data caching
  const { data: siteData, isLoading: loadingSiteData } = useQuery({
    queryKey: ["site-data", domain],
    queryFn: () => fetchSiteData(domain!),
    enabled: !!domain,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
  const verticalProfile = useMemo(
    () => resolveSiteVerticalProfile(siteData?.verticalProfile),
    [siteData]
  );

  // Campaign sites (Campagna 2027, Fabio Kaeppeli) swap the whole business menu
  // for a dedicated electoral menu. Business sites are entirely untouched.
  const isCampagna = isCampagnaElettorale(siteData?.siteType);

  const campagnaMenuItems = useMemo<MenuItem[]>(() => {
    if (!basePath) return [];
    return [
      {
        key: "campagna-dashboard",
        label: "Dashboard",
        icon: "faWaveSquare",
        href: `${basePath}/dashboard`,
        alert: false,
      },
      {
        key: "campagna-crm",
        label: "CRM",
        icon: "faUsers",
        alert: false,
        items: [
          {
            label: "Contatti",
            icon: "faUser",
            href: `${basePath}/crm/contatti`,
            alert: false,
          },
          {
            label: "Interazioni",
            icon: "faTable",
            href: `${basePath}/crm/interazioni`,
            alert: false,
          },
        ],
      },
      {
        key: "campagna-contenuti",
        label: "Contenuti",
        icon: "faBriefcase",
        href: `${basePath}/contenuti`,
        alert: false,
      },
      {
        key: "campagna-calendario",
        label: "Calendario",
        icon: "faCalendarDays",
        href: `${basePath}/calendario`,
        alert: false,
      },
      {
        key: "campagna-analisi",
        label: "Analisi",
        icon: "faSquarePollVertical",
        href: `${basePath}/analisi`,
        alert: false,
      },
    ];
  }, [basePath]);

  // Navigation labels for the entries that a business vertical can rename
  // (kanban / projects / reports). A non-default vertical profile keeps
  // priority (e.g. Speedywood renames "Progetti" -> "Ordini"); the default
  // profile falls back to the translated label so German spaces read in
  // German. All other nav labels are always translated via `t`.
  const navLabels = useMemo(
    () =>
      verticalProfile.key === "default"
        ? {
            kanban: t("nav.kanban"),
            projects: t("nav.projects"),
            reports: t("nav.reports"),
          }
        : {
            kanban: verticalProfile.menuLabels.kanban,
            projects: verticalProfile.menuLabels.projects,
            reports: verticalProfile.menuLabels.reports,
          },
    [verticalProfile, t]
  );

  // OPTIMIZED: Lazy load kanbans - only fetch when section is expanded
  const {
    data: kanbansLocal = [],
    isLoading: isLoadingKanbansLocal,
  } = useQuery({
    queryKey: ["kanbans-list", domain],
    queryFn: () => fetchKanbans(domain!),
    // Only fetch when domain exists, online, AND Kanban section has been opened
    enabled: !!domain && isOnline && kanbanOpened,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // OPTIMIZED: Lazy load kanban categories - only fetch when section is expanded
  const { data: kanbanCategories = [] } =
    useQuery({
      queryKey: ["kanban-categories", domain],
      queryFn: () => fetchKanbanCategories(domain!),
      // Only fetch when domain exists, online, AND Kanban section has been opened
      enabled: !!domain && isOnline && kanbanOpened,
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 60 * 60 * 1000, // 1 hour
    });

  // Prefetch kanban data on hover (before user clicks)
  const prefetchKanbanData = useCallback(() => {
    if (!domain || !isOnline || kanbanOpened) return;

    queryClient.prefetchQuery({
      queryKey: ["kanbans-list", domain],
      queryFn: () => fetchKanbans(domain),
      staleTime: 5 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ["kanban-categories", domain],
      queryFn: () => fetchKanbanCategories(domain),
      staleTime: 10 * 60 * 1000,
    });
  }, [domain, isOnline, kanbanOpened, queryClient]);

  const canManageSettings =
    userContext?.role === "admin" || userContext?.role === "superadmin";
  const settingsHref = useMemo(() => {
    if (!canManageSettings) return null;
    if (domain) {
      return siteData?.id ? `/administration/sites/${siteData.id}/edit` : null;
    }
    return "/administration";
  }, [canManageSettings, domain, siteData?.id]);

  const injectKanbanChildren = useCallback(
    (item: MenuItem): MenuItem => {
      const isSuperAdmin = userContext?.role === "superadmin";

      if (kanbanCategories.length === 0) {
        const kanbanSubItems: MenuItem[] = [
          ...(isLoadingKanbansLocal
            ? [
                {
                  label: t("common.loading"),
                  icon: "faWrench" as const,
                  href: "#",
                  alert: false,
                },
              ]
            : kanbansLocal.length === 0
              ? [
                  {
                    label: isOnline ? t("nav.noKanban") : t("nav.offlineData"),
                    icon: "faTable" as const,
                    href: "#",
                    alert: false,
                  },
                ]
              : kanbansLocal.map((kanban) => ({
                  key: `kanban-${kanban.id || kanban.identifier}`,
                  label: formatKanbanTitle(kanban.title),
                  icon: "faTable" as const,
                  lucideIcon: kanban.icon || "Folder",
                  href: `${basePath}/kanban?name=${kanban.identifier}`,
                  alert: false,
                  id: kanban.id || kanban.identifier,
                }))),
          ...(isSuperAdmin
            ? [
                {
                  label: t("nav.createKanban"),
                  icon: "faPlus" as const,
                  action: () => openCreateModal(null),
                  alert: false,
                },
              ]
            : []),
        ];
        return { ...item, items: kanbanSubItems };
      }

      const kanbanSubItems: MenuItem[] = kanbanCategories.map(
        (category: {
          id: number;
          name: string;
          icon?: string;
          color?: string;
          identifier: string;
        }) => {
          const categoryKanbans = kanbansLocal.filter(
            (k) => k.category_id === category.id
          );

          return {
            key: `kanban-cat-${category.id}`,
            label: category.name,
            icon: "faListUl" as const,
            lucideIcon: category.icon || "Folder",
            color: category.color || "#3B82F6",
            alert: false,
            items: [
              ...(isLoadingKanbansLocal
                ? [
                    {
                      label: t("common.loading"),
                      icon: "faWrench" as const,
                      href: "#",
                      alert: false,
                    },
                  ]
                : categoryKanbans.length === 0
                  ? [
                      {
                        label: isOnline
                          ? t("nav.noKanban")
                          : t("nav.offlineData"),
                        icon: "faTable" as const,
                        href: "#",
                        alert: false,
                      },
                    ]
                  : categoryKanbans.map((kanban) => ({
                      key: `kanban-${kanban.id || kanban.identifier}`,
                      label: formatKanbanTitle(kanban.title),
                      icon: "faTable" as const,
                      lucideIcon: kanban.icon || "Folder",
                      href: `${basePath}/kanban?name=${kanban.identifier}&category=${category.identifier}`,
                      alert: false,
                      id: kanban.id || kanban.identifier,
                    }))),
              ...(isSuperAdmin
                ? [
                    {
                      label: t("nav.createKanban"),
                      icon: "faPlus" as const,
                      action: () => openCreateModal(category.id),
                      alert: false,
                    },
                  ]
                : []),
            ],
          };
        }
      );

      const uncategorizedKanbans = kanbansLocal.filter((k) => !k.category_id);

      if (uncategorizedKanbans.length > 0 || isSuperAdmin) {
        kanbanSubItems.push({
          key: "kanban-uncategorized",
          label: t("nav.uncategorized"),
          icon: "faListUl" as const,
          lucideIcon: "Folder",
          color: "#6B7280",
          alert: false,
          items: [
            ...(isLoadingKanbansLocal
              ? [
                  {
                    label: t("common.loading"),
                    icon: "faWrench" as const,
                    href: "#",
                    alert: false,
                  },
                ]
              : uncategorizedKanbans.length === 0
                ? []
                : uncategorizedKanbans.map((kanban) => ({
                    key: `kanban-${kanban.id || kanban.identifier}`,
                    label: formatKanbanTitle(kanban.title),
                    icon: "faTable" as const,
                    lucideIcon: kanban.icon || "Folder",
                    href: `${basePath}/kanban?name=${kanban.identifier}`,
                    alert: false,
                    id: kanban.id || kanban.identifier,
                  }))),
            ...(isSuperAdmin
              ? [
                  {
                    label: t("nav.createKanban"),
                    icon: "faPlus" as const,
                    action: () => openCreateModal(null),
                    alert: false,
                  },
                ]
              : []),
          ],
        });
      }

      return { ...item, items: kanbanSubItems };
    },
    [
      userContext?.role,
      kanbanCategories,
      isLoadingKanbansLocal,
      kanbansLocal,
      isOnline,
      t,
      basePath,
      openCreateModal,
    ]
  );

  const resolvedNavGroups = useMemo(
    () =>
      buildSiteNavigation({
        basePath,
        enabledModules: enabledModules.map((m) => m.name),
        role: userContext?.role as NavMinRole | undefined,
        t,
        navLabels,
        settingsHref,
        includeMatrisHome: basePath === "/sites/matrispro",
      }),
    [basePath, enabledModules, userContext?.role, t, navLabels, settingsHref]
  );

  const navGroups = useMemo(
    () =>
      resolvedNavGroups.map((group) => ({
        ...group,
        items: group.items.map((item) => {
          const menuItem = toMenuItem(item);
          return menuItem.key === "kanban"
            ? injectKanbanChildren(menuItem)
            : menuItem;
        }),
      })),
    [resolvedNavGroups, injectKanbanChildren]
  );

  const isActive = useCallback(
    (href: string) => isNavPathActive(href, pathname, searchParams.toString()),
    [pathname, searchParams]
  );

  const toggleMenu = useCallback((key: string) => {
    setCollapsedMenus((prev) => {
      const nextCollapsed = prev[key] !== true;
      if (
        !nextCollapsed &&
        (key === "lavoro" || key === "kanban")
      ) {
        setKanbanOpened(true);
      }
      return {
        ...prev,
        [key]: nextCollapsed,
      };
    });
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (collapsedMenus.lavoro !== true) {
      setKanbanOpened(true);
    }
  }, [isHydrated, collapsedMenus.lavoro]);

  useEffect(() => {
    if (!isHydrated) return;
    const keys = collectOpenKeysForActivePath(
      resolvedNavGroups,
      pathname,
      searchParams.toString()
    );
    if (keys.length === 0) return;
    setCollapsedMenus((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const key of keys) {
        if (next[key] === true) {
          next[key] = false;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [isHydrated, pathname, searchParams, resolvedNavGroups]);

  const displayTitle = useMemo(() => {
    if (siteData) {
      return siteData.organization.name
        ? `${siteData.organization.name} - ${siteData.name}`
        : siteData.name;
    }
    return "Organization";
  }, [siteData]);

  const siteImage = useMemo(
    () => siteData?.logo || siteData?.image || null,
    [siteData]
  );
  const settingsTitle = domain ? t("nav.settings") : t("nav.administration");

  // Progressive loading: separate loading states for different parts
  // Header/footer load from hydration, so usually instant
  const isLoadingHeader = useMemo(() => {
    if (!domain) return false;
    // Keep the first client paint equal to SSR output to avoid hydration mismatch.
    if (!isHydrated) return true;
    return loadingSiteData;
  }, [domain, isHydrated, loadingSiteData]);

  // Menu items depend on modules
  const isLoadingMenuItems = useMemo(() => {
    if (!domain) return false;
    return loadingModules;
  }, [domain, loadingModules]);

  const renderMenuItem = (item: MenuItem) => {
    const collapseKey = item.key || item.label;
    const itemOpen =
      state === "collapsed" || collapsedMenus[collapseKey] !== true;

    // If item has subitems, use Collapsible
    if (item.items) {
      // Check if this is the Kanban menu for prefetch on hover
      const isKanbanMenu = item.key === "kanban";
      const childActive =
        item.items.some((child) =>
          menuItemContainsPath(child, pathname, searchParams.toString())
        ) ?? false;
      const selfActive = Boolean(
        item.href && isActive(item.href) && !childActive
      );
      const parentActive = menuItemContainsPath(
        item,
        pathname,
        searchParams.toString()
      );
      const hasParentLink = Boolean(item.href);

      const parentIcon = item.logoSrc ? (
        <img
          src={item.logoSrc}
          alt={item.label}
          className="h-5 w-5 shrink-0 rounded object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <FontAwesomeIcon icon={iconMap[item.icon]} className="w-4 h-4" />
      );

      return (
        <Collapsible
          key={collapseKey}
          open={itemOpen}
          onOpenChange={() => toggleMenu(collapseKey)}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            {hasParentLink && state !== "collapsed" ? (
              <div className="flex w-full items-center gap-0.5">
                <SidebarMenuButton
                  asChild
                  tooltip={item.label}
                  isActive={selfActive}
                  className="flex-1"
                  onMouseEnter={isKanbanMenu ? prefetchKanbanData : undefined}
                >
                  <Link href={item.href!}>
                    {parentIcon}
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    aria-label={item.label}
                    className="flex size-8 shrink-0 items-center justify-center rounded-xl text-[hsl(var(--sidebar-foreground)/0.7)] hover:bg-[hsl(var(--sidebar-card)/0.68)] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 transition-transform duration-150 ease-out",
                        collapsedMenus[collapseKey] === true && "-rotate-90"
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
              </div>
            ) : (
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  tooltip={item.label}
                  isActive={parentActive}
                  onMouseEnter={isKanbanMenu ? prefetchKanbanData : undefined}
                >
                  {parentIcon}
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </CollapsibleTrigger>
            )}
            <CollapsibleContent>
              <SidebarMenuSub
                className={isKanbanMenu ? NAV_KANBAN_LIST : NAV_SUBTREE}
              >
                {item.items.map((subItem: MenuItem, index: number) => {
                  if (subItem.items) {
                    // Nested collapsible for third level (kanban categories)
                    const LucideIcon = subItem.lucideIcon
                      ? getKanbanIcon(subItem.lucideIcon)
                      : null;
                    const nestedKey = subItem.key || subItem.label;
                    const categoryActive = menuItemContainsPath(
                      subItem,
                      pathname,
                      searchParams.toString()
                    );
                    return (
                      <SidebarMenuSubItem
                        key={
                          subItem.id ||
                          subItem.href ||
                          `${nestedKey}-${index}`
                        }
                        className={cn(
                          isKanbanMenu && NAV_CATEGORY_FRAME,
                          isKanbanMenu &&
                            categoryActive &&
                            NAV_CATEGORY_FRAME_ACTIVE
                        )}
                        style={
                          isKanbanMenu
                            ? categoryActive
                              ? NAV_CATEGORY_FRAME_ACTIVE_STYLE
                              : NAV_CATEGORY_FRAME_STYLE
                            : undefined
                        }
                      >
                        <Collapsible
                          open={
                            state === "collapsed" ||
                            collapsedMenus[nestedKey] !== true
                          }
                          onOpenChange={() => toggleMenu(nestedKey)}
                          className="group/collapsible min-w-0"
                        >
                          <CollapsibleTrigger asChild>
                            <SidebarMenuSubButton>
                              {LucideIcon ? (
                                <div
                                  className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                                  style={{
                                    backgroundColor: subItem.color || "#3B82F6",
                                  }}
                                >
                                  <LucideIcon className="w-3 h-3 text-white" />
                                </div>
                              ) : (
                                <FontAwesomeIcon
                                  icon={iconMap[subItem.icon]}
                                  className="w-4 h-4"
                                />
                              )}
                              <span>{subItem.label}</span>
                            </SidebarMenuSubButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub className={NAV_CATEGORY_ITEMS}>
                              {subItem.items.map(
                                (nestedItem: MenuItem, nestedIndex: number) => (
                                  <SidebarMenuSubItem
                                    key={
                                      nestedItem.id ||
                                      nestedItem.href ||
                                      `${nestedItem.label}-${nestedIndex}`
                                    }
                                  >
                                    <SidebarMenuSubButton
                                      asChild={
                                        !!nestedItem.href && !nestedItem.action
                                      }
                                      isActive={
                                        nestedItem.href
                                          ? isActive(nestedItem.href)
                                          : false
                                      }
                                      onClick={nestedItem.action}
                                      className={
                                        nestedItem.action
                                          ? "[&>div>span]:line-clamp-2"
                                          : "[&>span:last-child]:line-clamp-2"
                                      }
                                    >
                                      {nestedItem.action ? (
                                        <div className="flex items-center gap-2">
                                          {nestedItem.lucideIcon ? (
                                            (() => {
                                              const LucideIcon = getKanbanIcon(
                                                nestedItem.lucideIcon
                                              );
                                              return (
                                                <LucideIcon className="w-4 h-4 shrink-0" />
                                              );
                                            })()
                                          ) : (
                                            <FontAwesomeIcon
                                              icon={iconMap[nestedItem.icon]}
                                              className="w-4 h-4 shrink-0"
                                            />
                                          )}
                                          <span className="whitespace-normal wrap-break-words">
                                            {nestedItem.label}
                                          </span>
                                        </div>
                                      ) : (
                                        <Link href={nestedItem.href!}>
                                          {nestedItem.lucideIcon ? (
                                            (() => {
                                              const LucideIcon = getKanbanIcon(
                                                nestedItem.lucideIcon
                                              );
                                              return (
                                                <LucideIcon className="w-4 h-4" />
                                              );
                                            })()
                                          ) : (
                                            <FontAwesomeIcon
                                              icon={iconMap[nestedItem.icon]}
                                              className="w-4 h-4"
                                            />
                                          )}
                                          <span>{nestedItem.label}</span>
                                        </Link>
                                      )}
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                )
                              )}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </Collapsible>
                      </SidebarMenuSubItem>
                    );
                  }

                  return (
                    <SidebarMenuSubItem
                      key={
                        subItem.id ||
                        subItem.href ||
                        `${subItem.label}-${index}`
                      }
                    >
                      {subItem.customComponent ? (
                        subItem.customComponent
                      ) : (
                        <SidebarMenuSubButton
                          asChild={!!subItem.href && !subItem.action}
                          isActive={
                            subItem.href ? isActive(subItem.href) : false
                          }
                          onClick={subItem.action}
                          className={
                            subItem.action
                              ? "[&>div>span]:line-clamp-2"
                              : "[&>span:last-child]:line-clamp-2"
                          }
                        >
                          {subItem.action ? (
                            <div className="flex items-center gap-2 cursor-pointer">
                              {subItem.lucideIcon ? (
                                (() => {
                                  const LucideIcon = getKanbanIcon(
                                    subItem.lucideIcon
                                  );
                                  return (
                                    <LucideIcon className="w-4 h-4 shrink-0" />
                                  );
                                })()
                              ) : (
                                <FontAwesomeIcon
                                  icon={iconMap[subItem.icon]}
                                  className="w-4 h-4 shrink-0"
                                />
                              )}
                              <span className="whitespace-normal wrap-break-words">
                                {subItem.label}
                              </span>
                            </div>
                          ) : (
                            <Link href={subItem.href!}>
                              {subItem.lucideIcon ? (
                                (() => {
                                  const LucideIcon = getKanbanIcon(
                                    subItem.lucideIcon
                                  );
                                  return <LucideIcon className="w-4 h-4" />;
                                })()
                              ) : (
                                <FontAwesomeIcon
                                  icon={iconMap[subItem.icon]}
                                  className="w-4 h-4"
                                />
                              )}
                              <span>{subItem.label}</span>
                            </Link>
                          )}
                        </SidebarMenuSubButton>
                      )}
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    // Regular menu item without subitems
    const TopIcon = item.lucideIcon
      ? getKanbanIcon(item.lucideIcon)
      : null;
    return (
      <SidebarMenuItem key={collapseKey}>
        <SidebarMenuButton
          asChild={!!item.href && !item.action}
          tooltip={item.label}
          isActive={item.href ? isActive(item.href) : false}
          onClick={item.action}
        >
          {item.action ? (
            <div className="flex items-center gap-2 cursor-pointer">
              {TopIcon ? (
                <TopIcon className="w-4 h-4" />
              ) : (
                <FontAwesomeIcon icon={iconMap[item.icon]} className="w-4 h-4" />
              )}
              <span>{item.label}</span>
            </div>
          ) : (
            <Link href={item.href!}>
              {TopIcon ? (
                <TopIcon className="w-4 h-4" />
              ) : (
                <FontAwesomeIcon icon={iconMap[item.icon]} className="w-4 h-4" />
              )}
              <span>{item.label}</span>
            </Link>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* PROGRESSIVE LOADING: Show header immediately, skeleton only for loading parts */}

        <div className={NAV_GROUP_FRAME} style={NAV_GROUP_FRAME_STYLE}>
          <SidebarGroup className={NAV_GROUP_UNBOXED}>
            <SidebarGroupLabel className="h-auto px-2.5 py-2.5">
              {isLoadingHeader ? (
                <Skeleton className="h-10 w-28 bg-gray-200 dark:bg-white/10" />
              ) : (
                <div className="flex w-full items-center justify-between gap-2">
                  {siteImage ? (
                    <div className="flex min-w-0 flex-1 items-center rounded-xl bg-white px-2 py-1.5 shadow-sm">
                      <img
                        src={siteImage}
                        alt={displayTitle}
                        className="max-h-11 w-auto object-contain"
                        title={displayTitle}
                      />
                    </div>
                  ) : (
                    <span className="truncate px-1">{displayTitle}</span>
                  )}
                  <div className="flex shrink-0 items-center gap-1.5">
                    {domain && <CommandDeckLauncher domain={domain} />}
                    <QuickActions />
                  </div>
                </div>
              )}
            </SidebarGroupLabel>
          </SidebarGroup>
        </div>

        {/* Campaign sites render a fixed electoral menu; business sites use
            the 6-area config from lib/navigation.ts. */}
        {isCampagna ? (
          <>
            <div className={NAV_GROUP_FRAME} style={NAV_GROUP_FRAME_STYLE}>
              <SidebarGroup className={NAV_GROUP_UNBOXED}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {campagnaMenuItems.map(renderMenuItem)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </div>

            {canManageSettings && settingsHref && (
              <SidebarGroup className={cn(NAV_GROUP_UNBOXED, "mt-auto")}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip={settingsTitle}
                        isActive={isActive(settingsHref)}
                      >
                        <Link href={settingsHref}>
                          <Settings className="h-4 w-4" />
                          <span>{settingsTitle}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        ) : isLoadingMenuItems ? (
          <SidebarGroup className={NAV_GROUP_UNBOXED}>
            <SidebarGroupContent>
              <SidebarMenu>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <SidebarMenuItem key={i}>
                    <div className="flex items-center gap-2 px-2 py-2">
                      <Skeleton className="h-4 w-4 rounded bg-gray-200 dark:bg-white/10" />
                      <Skeleton className="h-4 w-24 bg-gray-200 dark:bg-white/10" />
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          navGroups.map((group) => {
            const groupOpen =
              state === "collapsed" || collapsedMenus[group.id] !== true;
            const groupHasActive = group.items.some((item) =>
              menuItemContainsPath(item, pathname, searchParams.toString())
            );
            return (
              <Collapsible
                key={group.id}
                open={groupOpen}
                onOpenChange={() => toggleMenu(group.id)}
                className="group/nav-group"
              >
                <div className={NAV_GROUP_FRAME} style={NAV_GROUP_FRAME_STYLE}>
                  <SidebarGroup className={NAV_GROUP_UNBOXED}>
                    <CollapsibleTrigger
                      className={cn(
                        NAV_GROUP_LABEL,
                        groupHasActive &&
                          "text-[hsl(var(--sidebar-foreground)/0.95)] dark:text-white dark:hover:text-white",
                        state === "collapsed" && "hidden"
                      )}
                    >
                      <span className="flex-1 truncate whitespace-nowrap [color:inherit]">
                        {group.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          "ml-auto shrink-0 transition-transform duration-150 ease-out",
                          collapsedMenus[group.id] === true && "-rotate-90"
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="min-w-0 overflow-x-hidden px-2 pb-2.5 group-data-[collapsible=icon]:overflow-visible group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pb-0">
                        <SidebarGroupContent>
                          <SidebarMenu>
                            {group.items.map(renderMenuItem)}
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </div>
                    </CollapsibleContent>
                  </SidebarGroup>
                </div>
              </Collapsible>
            );
          })
        )}
      </SidebarContent>
      <SidebarFooter>
        {/* Footer loads progressively - theme switcher always visible */}
        <div className="flex flex-col gap-3">
          {/* Quick access icons for Ore, Errori, Reports */}
          {domain && !isCampagna && (
            <div
              className={cn(
                "rounded-2xl border border-slate-600/70 bg-[hsl(var(--sidebar-card)/0.5)] py-2 shadow-[0_8px_20px_hsl(var(--sidebar-card-shadow)/0.1)] dark:bg-black/10 dark:shadow-none",
                state === "collapsed"
                  ? "w-full flex-col items-center gap-1 justify-center px-1"
                  : "flex-row justify-around px-2"
              )}
            >
              {enabledModules.some((m) => m.name === "timetracking") && (
                <Link
                  href={`${basePath}/timetracking`}
                  title={t("nav.hours")}
                  aria-label={t("nav.hours")}
                  className="rounded-xl p-2 text-[hsl(var(--sidebar-foreground)/0.7)] transition-colors hover:bg-[hsl(var(--sidebar-card-strong))] hover:text-[hsl(var(--sidebar-foreground))] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <FontAwesomeIcon
                    icon={faClock}
                    className="h-5 w-5"
                  />
                </Link>
              )}
              {enabledModules.some((m) => m.name === "errortracking") && (
                <Link
                  href={`${basePath}/errortracking`}
                  title={t("nav.errors")}
                  aria-label={t("nav.errors")}
                  className="rounded-xl p-2 text-[hsl(var(--sidebar-foreground)/0.7)] transition-colors hover:bg-[hsl(var(--sidebar-card-strong))] hover:text-[hsl(var(--sidebar-foreground))] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <FontAwesomeIcon
                    icon={faExclamation}
                    className="h-5 w-5"
                  />
                </Link>
              )}
              {enabledModules.some((m) =>
                ["report-time", "report-inventory", "report-projects", "report-errors", "report-imb"].includes(m.name)
              ) && (
                <Link
                  href={`${basePath}/reports`}
                  title={navLabels.reports}
                  aria-label={navLabels.reports}
                  className="rounded-xl p-2 text-[hsl(var(--sidebar-foreground)/0.7)] transition-colors hover:bg-[hsl(var(--sidebar-card-strong))] hover:text-[hsl(var(--sidebar-foreground))] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <FontAwesomeIcon
                    icon={faSquarePollVertical}
                    className="h-5 w-5"
                  />
                </Link>
              )}
            </div>
          )}
          <ThemeSwitcher />
          {userContext ? (
            <UserSection user={userContext} domain={domain ?? undefined} />
          ) : (
            /* Show skeleton only while user context is loading */
            <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--sidebar-border)/0.8)] bg-[hsl(var(--sidebar-card)/0.9)] px-3 py-3 shadow-[0_10px_24px_hsl(var(--sidebar-card-shadow)/0.12)] dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none">
              <Skeleton className="h-9 w-9 rounded-md shrink-0 bg-gray-200 dark:bg-white/10" />
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <Skeleton className="h-4 w-32 bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-3 w-24 bg-gray-200 dark:bg-white/10" />
              </div>
            </div>
          )}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
