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
  SidebarSeparator,
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
import { logger } from "@/lib/logger";
import KanbanManagementModal from "./kanbans/KanbanManagementModal";
import { useToast } from "./ui/use-toast";
import { useKanbanStore } from "../store/kanban-store";
import { Kanban } from "../store/kanban-store";
import Link from "next/link";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSiteModules } from "@/hooks/use-site-modules";
import { useKanbanModal } from "@/components/kanbans/KanbanModalContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { resolveSiteVerticalProfile } from "@/lib/site-verticals";
import { useT } from "@/components/i18n/i18n-provider";
import type { Translator } from "@/lib/i18n";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Settings } from "lucide-react";
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
  faHouse,
  faMusic,
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
const SIDEBAR_COLLAPSED_MENUS_KEY = "santini-sidebar-collapsed-menus";
const SIDEBAR_KANBAN_OPENED_KEY = "santini-sidebar-kanban-opened";

// Helper function to get initial collapsed menus state from localStorage
const getInitialCollapsedMenus = (): Record<string, boolean> => {
  if (typeof window === "undefined") return { Kanban: true };
  try {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_MENUS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return { Kanban: true };
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
const iconMap = {
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
  faHouse,
  faMusic,
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
  icon: keyof typeof iconMap;
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

// Optimized domain extraction function
const extractDomainFromPath = (pathname: string): string | null => {
  const match = pathname.match(/\/sites\/([^\/]+)/);
  return match ? match[1] : null;
};

// Enhanced menu items generation with better module filtering
const getMenuItems = (
  pathname: string,
  enabledModules: string[] = [],
  basePath: string = "",
  t: Translator,
  navLabels: {
    kanban: string;
    projects: string;
    reports: string;
  }
): MenuItem[] => {
  const allSiteItems: MenuItem[] = [
    {
      key: "dashboard",
      label: t("nav.dashboard"),
      icon: "faWaveSquare",
      alert: true,
      moduleName: "dashboard",
      items: [
        {
          label: t("nav.overview"),
          icon: "faWaveSquare",
          href: `${basePath}/dashboard`,
          alert: false,
          moduleName: "dashboard",
        },
        {
          label: t("nav.forecast"),
          icon: "faSquarePollVertical",
          href: `${basePath}/dashboard/forecast`,
          alert: false,
          moduleName: "dashboard-forecast",
        },
      ],
    },
    {
      key: "kanban",
      label: navLabels.kanban,
      icon: "faTable",
      alert: true,
      moduleName: "kanban",
      items: [
        {
          label: t("nav.kanbanOffice"),
          icon: "faBriefcase",
          href: `${basePath}/kanban?type=office`,
          alert: false,
          moduleName: "kanban",
        },
        {
          label: t("nav.kanbanProduction"),
          icon: "faIndustry",
          href: `${basePath}/kanban?type=production`,
          alert: false,
          moduleName: "kanban",
        },
      ],
    },
    {
      key: "momentum",
      label: "Momentum",
      icon: "faMusic",
      logoSrc: "/momentum-logo.png",
      alert: true,
      moduleName: "momentum",
      items: [
        {
          label: "Home",
          icon: "faHouse",
          href: `${basePath}/momentum`,
          alert: false,
          moduleName: "momentum",
        },
        {
          label: "Vendita",
          icon: "faBriefcase",
          href: `${basePath}/momentum/vendita`,
          alert: false,
          moduleName: "momentum",
        },
        {
          label: "Plan",
          icon: "faTable",
          href: `${basePath}/momentum/plan`,
          alert: false,
          moduleName: "momentum",
        },
        {
          label: "Accounting",
          icon: "faSquarePollVertical",
          href: `${basePath}/momentum/accounting`,
          alert: false,
          moduleName: "momentum",
        },
        {
          label: "Mappa",
          icon: "faBuilding",
          href: `${basePath}/momentum/mappa`,
          alert: false,
          moduleName: "momentum",
        },
      ],
    },
    {
      key: "personalManager",
      label: "Manager Personale",
      icon: "faUser",
      href: `${basePath}/personal-manager`,
      alert: false,
      moduleName: "personal-manager",
    },
    {
      key: "documents",
      label: t("nav.documents"),
      icon: "faBriefcase",
      href: `${basePath}/documenti`,
      alert: false,
      moduleName: "projects",
    },
    {
      key: "calendars",
      label: t("nav.calendars"),
      icon: "faCalendarDays",
      alert: false,
      items: [
        {
          label: t("nav.calendarProduction"),
          icon: "faCalendarCheck",
          href: `${basePath}/calendar`,
          alert: false,
          moduleName: "calendar",
        },
        {
          label: t("nav.calendarInstallation"),
          icon: "faCalendarDays",
          href: `${basePath}/calendar-installation`,
          alert: false,
          moduleName: "calendar",
        },
        {
          label: t("nav.calendarService"),
          icon: "faCalendarDays",
          href: `${basePath}/calendar-service`,
          alert: false,
          moduleName: "calendar",
        },
      ],
    },
    {
      key: "hours",
      label: t("nav.hours"),
      icon: "faClock",
      href: `${basePath}/timetracking`,
      alert: false,
      moduleName: "timetracking",
    },
    {
      key: "attendance",
      label: t("nav.attendance"),
      icon: "faCalendarCheck",
      href: `${basePath}/attendance`,
      alert: false,
      moduleName: "attendance",
    },
    {
      key: "collaboratorArea",
      label: t("nav.collaboratorArea"),
      icon: "faUser",
      href: `${basePath}/area-collaboratore`,
      alert: false,
      moduleName: "area-collaboratore",
    },
    {
      key: "contacts",
      label: t("nav.contacts"),
      icon: "faUsers",
      alert: false,
      items: [
        {
          label: t("nav.clients"),
          icon: "faUser",
          href: `${basePath}/clients`,
          alert: false,
          moduleName: "clients",
        },
        {
          label: t("nav.suppliers"),
          icon: "faHelmetSafety",
          href: `${basePath}/suppliers`,
          alert: false,
          moduleName: "suppliers",
        },
        {
          label: t("nav.manufacturers"),
          icon: "faIndustry",
          href: `${basePath}/manufacturers`,
          alert: false,
          moduleName: "manufacturers",
        },
        {
          label: t("nav.resellers"),
          icon: "faTruckField",
          href: `${basePath}/resellers`,
          alert: false,
          moduleName: "resellers",
        },
        {
          label: t("nav.collaborators"),
          icon: "faUserTie",
          href: `${basePath}/collaborators`,
          alert: false,
          moduleName: "collaborators",
        },
      ],
    },
    {
      key: "warehouse",
      label: t("nav.warehouse"),
      icon: "faWarehouse",
      alert: false,
      moduleName: "inventory",
      href: `${basePath}/inventory`,
    },
    {
      key: "factory",
      label: t("nav.factory"),
      icon: "faIndustry",
      alert: false,
      moduleName: "factory",
      href: `${basePath}/factory`,
    },
    {
      key: "products",
      label: t("nav.products"),
      icon: "faBox",
      href: `${basePath}/products`,
      alert: false,
      moduleName: "products",
    },
    {
      key: "projects",
      label: navLabels.projects,
      icon: "faTable",
      href: `${basePath}/projects`,
      alert: false,
      moduleName: "projects",
    },
    {
      key: "categories",
      label: t("nav.categories"),
      icon: "faListUl",
      alert: false,
      items: [
        {
          label: t("nav.categoriesInventory"),
          icon: "faListUl",
          href: `${basePath}/categories`,
          alert: false,
          moduleName: "categories",
        },
        {
          label: t("nav.categoriesProducts"),
          icon: "faListUl",
          href: `${basePath}/product-categories`,
          alert: false,
          moduleName: "products",
        },
        {
          label: t("nav.categoriesSuppliers"),
          icon: "faListUl",
          href: `${basePath}/supplier-categories`,
          alert: false,
          moduleName: "suppliers",
        },
        {
          label: t("nav.categoriesManufacturers"),
          icon: "faListUl",
          href: `${basePath}/manufacturer-categories`,
          alert: false,
          moduleName: "manufacturers",
        },
      ],
    },
    {
      key: "errors",
      label: t("nav.errors"),
      icon: "faExclamation",
      href: `${basePath}/errortracking`,
      alert: false,
      moduleName: "errortracking",
    },
    {
      key: "reports",
      label: navLabels.reports,
      icon: "faSquarePollVertical",
      href: `${basePath}/reports`,
      alert: false,
      // Show Reports menu if any report module is enabled (no main module, just alternatives)
      alternativeModules: ["report-time", "report-inventory", "report-projects", "report-errors", "report-imb"],
      items: [
        {
          label: t("nav.reportTime"),
          icon: "faClock",
          href: `${basePath}/reports`,
          alert: false,
          moduleName: "report-time",
        },
        {
          label: t("nav.reportInventory"),
          icon: "faWarehouse",
          href: `${basePath}/reports`,
          alert: false,
          moduleName: "report-inventory",
        },
        {
          label: t("nav.reportProjects"),
          icon: "faTable",
          href: `${basePath}/reports`,
          alert: false,
          moduleName: "report-projects",
        },
        {
          label: t("nav.reportErrors"),
          icon: "faExclamation",
          href: `${basePath}/reports`,
          alert: false,
          moduleName: "report-errors",
        },
        {
          label: t("nav.reportImb"),
          icon: "faBox",
          href: `${basePath}/reports`,
          alert: false,
          moduleName: "report-imb",
        },
        {
          label: t("nav.qualityControl"),
          icon: "faCheckSquare",
          href: `${basePath}/qualityControl`,
          alert: false,
          moduleName: "qualitycontrol",
        },
        {
          label: t("nav.doQualityControl"),
          icon: "faCheckSquare",
          href: `${basePath}/qualityControl/edit`,
          alert: false,
          moduleName: "qualitycontrol",
        },
        {
          label: t("nav.boxing"),
          icon: "faBox",
          href: `${basePath}/boxing`,
          alert: false,
          moduleName: "boxing",
        },
        {
          label: t("nav.doBoxing"),
          icon: "faBox",
          href: `${basePath}/boxing/edit`,
          alert: false,
          moduleName: "boxing",
        },
      ],
    },
  ];

  // Enhanced module filtering with better performance
  const siteSpecificItems = allSiteItems.filter((item) => {
    // Helper to check if a module or any of its alternatives is enabled
    const isModuleOrAlternativeEnabled = (moduleName?: string, alternativeModules?: string[]) => {
      if (moduleName && enabledModules.includes(moduleName)) return true;
      if (alternativeModules) {
        return alternativeModules.some(alt => enabledModules.includes(alt));
      }
      return false;
    };
    
    // If item has sub-items, always filter them based on their moduleNames
    if (item.items) {
      const enabledSubItems = item.items.filter(
        (subItem) =>
          !subItem.moduleName || enabledModules.includes(subItem.moduleName)
      );
      
      // Check if parent module or any alternative is enabled
      const parentModuleEnabled = isModuleOrAlternativeEnabled(item.moduleName, item.alternativeModules);
      
      if (enabledSubItems.length > 0) {
        item.items = enabledSubItems;
        // If parent has no moduleName and no alternatives, show it if it has enabled sub-items
        if (!item.moduleName && !item.alternativeModules) return true;
        // If parent has moduleName or alternatives, check if any is enabled
        return parentModuleEnabled;
      }
      
      // If no sub-items are enabled but the parent module itself is enabled,
      // show the menu without sub-items (will link directly to parent href)
      if (parentModuleEnabled && item.href) {
        // Remove items array so it renders as a simple link
        delete item.items;
        return true;
      }
      
      return false;
    }

    // Items without sub-items and without moduleName are always shown
    if (!item.moduleName) return true;

    // Items with moduleName must be in enabledModules (or alternatives)
    return isModuleOrAlternativeEnabled(item.moduleName, item.alternativeModules);
  });

  // Add admin-only items if not on site domain
  if (!basePath) {
    siteSpecificItems.push(
      {
        key: "users",
        label: t("nav.users"),
        icon: "faUsers",
        href: "/administration/users",
        alert: false,
      },
      {
        key: "sites",
        label: t("nav.sites"),
        icon: "faTable",
        href: "/administration/sites",
        alert: false,
      }
    );
  }

  return siteSpecificItems;
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
  // Server-safe defaults: localStorage is read only after mount, so the
  // first client render matches the SSR HTML (avoids hydration mismatch).
  const [collapsedMenus, setCollapsedMenus] = useState<Record<string, boolean>>(
    { Kanban: true }
  );
  const { toast } = useToast();
  const { isOnline } = useOnlineStatus();
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
    refetch: refetchKanbans,
  } = useQuery({
    queryKey: ["kanbans-list", domain],
    queryFn: () => fetchKanbans(domain!),
    // Only fetch when domain exists, online, AND Kanban section has been opened
    enabled: !!domain && isOnline && kanbanOpened,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // OPTIMIZED: Lazy load kanban categories - only fetch when section is expanded
  const { data: kanbanCategories = [], isLoading: isLoadingCategories } =
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

  const refreshKanbansOptimized = useCallback(async () => {
    if (!isOnline || !domain) {
      if (!isOnline) {
        toast({
          title: "Impossibile aggiornare",
          description: "Nessuna connessione internet disponibile",
          variant: "destructive",
        });
      }
      return;
    }

    try {
      await refetchKanbans();
      toast({
        title: "Aggiornamento completato",
        description: "Lista kanban aggiornata con successo",
      });
    } catch (error) {
      logger.error("Error refreshing kanbans:", error);
      toast({
        title: "Errore nell'aggiornamento",
        description: "Impossibile aggiornare la lista kanban",
        variant: "destructive",
      });
    }
  }, [isOnline, toast, domain, refetchKanbans]);

  // Optimized menu items generation
  const menuItems = useMemo(() => {
    const items = getMenuItems(
      pathname,
      enabledModules.map((m) => m.name),
      basePath,
      t,
      navLabels
    );

    return items.map((item: MenuItem) => {
      if (item.key === "kanban") {
        const isSuperAdmin = userContext?.role === "superadmin";

        // Se non ci sono categorie, mostra tutte le kanban senza raggruppamento
        if (kanbanCategories.length === 0) {
          const kanbanSubItems = [
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
                    label: isOnline
                      ? t("nav.noKanban")
                      : t("nav.offlineData"),
                    icon: "faTable" as const,
                    href: "#",
                    alert: false,
                  },
                ]
              : kanbansLocal.map((kanban) => ({
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

          return {
            ...item,
            items: kanbanSubItems,
          };
        }

        // Raggruppa le kanban per categoria
        const kanbanSubItems = kanbanCategories.map((category: any) => {
          const categoryKanbans = kanbansLocal.filter(
            (k) => k.category_id === category.id
          );

          return {
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
        });

        // Aggiungi le kanban senza categoria
        const uncategorizedKanbans = kanbansLocal.filter((k) => !k.category_id);

        if (uncategorizedKanbans.length > 0 || isSuperAdmin) {
          kanbanSubItems.push({
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

        return {
          ...item,
          items: kanbanSubItems,
        };
      }
      return item;
    });
  }, [
    pathname,
    enabledModules,
    basePath,
    t,
    navLabels,
    kanbansLocal,
    kanbanCategories,
    isLoadingKanbansLocal,
    isOnline,
    userContext,
    openCreateModal,
  ]);

  // Optimized utility functions - Include query params for proper Kanban selection
  const isActive = useCallback(
    (href: string) => {
      const [hrefPath, hrefQuery] = href.split("?");
      const currentPath = pathname;
      const currentQuery = searchParams.toString();
      
      // If href has query params, compare full URL (path + query)
      if (hrefQuery) {
        const currentFullUrl = currentQuery ? `${currentPath}?${currentQuery}` : currentPath;
        return currentFullUrl === href;
      }
      
      // For hrefs without query params, just compare the path
      return currentPath === hrefPath;
    },
    [pathname, searchParams]
  );

  const toggleMenu = useCallback((label: string) => {
    setCollapsedMenus((prev) => {
      const wasCollapsed = prev[label];
      // If opening Kanban section, mark it as opened for lazy loading
      if (label === navLabels.kanban && wasCollapsed) {
        setKanbanOpened(true);
      }
      return {
        ...prev,
        [label]: !wasCollapsed,
      };
    });
  }, [navLabels]);

  // Optimized display values
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
  const canManageSettings =
    userContext?.role === "admin" || userContext?.role === "superadmin";
  const settingsHref = useMemo(() => {
    if (!canManageSettings) return null;
    if (domain) {
      return siteData?.id ? `/administration/sites/${siteData.id}/edit` : null;
    }
    return "/administration";
  }, [canManageSettings, domain, siteData?.id]);
  const settingsTitle = domain ? t("nav.settings") : t("nav.administration");

  // Raggruppa i menu items per categoria (per chiave stabile, indipendente
  // dalla lingua/label tradotta).
  const groupedMenuItems = useMemo(() => {
    const GROUPED_KEYS = [
      "dashboard",
      "kanban",
      "calendars",
      "hours",
      "attendance",
      "contacts",
      "warehouse",
      "factory",
      "products",
      "projects",
      "documents",
      "categories",
      "errors",
      "reports",
    ];
    const core = menuItems.filter((item) => item.key === "dashboard");
    const projects = menuItems.filter((item) => item.key === "kanban");
    const documenti = menuItems.filter((item) => item.key === "documents");
    const calendars = menuItems.filter((item) => item.key === "calendars");
    const contacts = menuItems.filter((item) => item.key === "contacts");
    const warehouse = menuItems.filter((item) => item.key === "warehouse");
    const factory = menuItems.filter((item) => item.key === "factory");
    const products = menuItems.filter((item) => item.key === "products");
    const projectsSection = menuItems.filter((item) => item.key === "projects");
    const categories = menuItems.filter((item) => item.key === "categories");
    const attendance = menuItems.filter((item) => item.key === "attendance");
    const others = menuItems.filter(
      (item) => !item.key || !GROUPED_KEYS.includes(item.key)
    );

    return {
      core,
      projects,
      documenti,
      calendars,
      attendance,
      contacts,
      warehouse,
      factory,
      products,
      projectsSection,
      categories,
      others,
    };
  }, [menuItems]);

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

  // Kanban section loading (only when expanded)
  const isLoadingKanbanSection = useMemo(() => {
    return kanbanOpened && (isLoadingKanbansLocal || isLoadingCategories);
  }, [kanbanOpened, isLoadingKanbansLocal, isLoadingCategories]);

  // Legacy: keep for backwards compatibility but now more granular
  const isLoadingSidebar = useMemo(() => {
    if (!domain) return false;
    return loadingModules || loadingSiteData;
  }, [domain, loadingModules, loadingSiteData]);

  // Skeleton component for loading state - Content
  const SidebarSkeletonContent = () => (
    <>
      {/* Logo skeleton */}
      <SidebarGroup>
        <SidebarGroupLabel className="h-auto py-2">
          <Skeleton className="h-10 w-28 bg-gray-200 dark:bg-white/10" />
        </SidebarGroupLabel>
        {/* Dashboard skeleton */}
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-2">
                <Skeleton className="h-4 w-4 rounded bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-4 w-20 bg-gray-200 dark:bg-white/10" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      {/* Kanban section skeleton with nested categories */}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {/* Kanban header */}
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-2">
                <Skeleton className="h-4 w-4 rounded bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-4 w-16 bg-gray-200 dark:bg-white/10" />
              </div>
            </SidebarMenuItem>
            {/* Category: Ufficio */}
            <div className="pl-4 mt-1 space-y-1">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Skeleton className="h-3.5 w-3.5 rounded bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-3.5 w-14 bg-gray-200 dark:bg-white/10" />
              </div>
              <div className="pl-4 space-y-1">
                <div className="flex items-center gap-2 px-2 py-1">
                  <Skeleton className="h-3 w-3 rounded bg-gray-200 dark:bg-white/10" />
                  <Skeleton className="h-3 w-16 bg-gray-200 dark:bg-white/10" />
                </div>
                <div className="flex items-center gap-2 px-2 py-1">
                  <Skeleton className="h-3 w-3 rounded bg-gray-200 dark:bg-white/10" />
                  <Skeleton className="h-3 w-14 bg-gray-200 dark:bg-white/10" />
                </div>
              </div>
            </div>
            {/* Category: Produzione */}
            <div className="pl-4 mt-1 space-y-1">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Skeleton className="h-3.5 w-3.5 rounded bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-3.5 w-20 bg-gray-200 dark:bg-white/10" />
              </div>
              <div className="pl-4 space-y-1">
                <div className="flex items-center gap-2 px-2 py-1">
                  <Skeleton className="h-3 w-3 rounded bg-gray-200 dark:bg-white/10" />
                  <Skeleton className="h-3 w-24 bg-gray-200 dark:bg-white/10" />
                </div>
                <div className="flex items-center gap-2 px-2 py-1">
                  <Skeleton className="h-3 w-3 rounded bg-gray-200 dark:bg-white/10" />
                  <Skeleton className="h-3 w-12 bg-gray-200 dark:bg-white/10" />
                </div>
                <div className="flex items-center gap-2 px-2 py-1">
                  <Skeleton className="h-3 w-3 rounded bg-gray-200 dark:bg-white/10" />
                  <Skeleton className="h-3 w-20 bg-gray-200 dark:bg-white/10" />
                </div>
              </div>
            </div>
            {/* Category: Senza Categoria */}
            <div className="pl-4 mt-1 space-y-1">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Skeleton className="h-3.5 w-3.5 rounded bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-3.5 w-28 bg-gray-200 dark:bg-white/10" />
              </div>
            </div>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      {/* Calendari section skeleton */}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-2">
                <Skeleton className="h-4 w-4 rounded bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-4 w-20 bg-gray-200 dark:bg-white/10" />
              </div>
            </SidebarMenuItem>
            <div className="pl-4 mt-1 space-y-1">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Skeleton className="h-3.5 w-3.5 rounded bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-3.5 w-28 bg-gray-200 dark:bg-white/10" />
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Skeleton className="h-3.5 w-3.5 rounded bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-3.5 w-20 bg-gray-200 dark:bg-white/10" />
              </div>
            </div>
            {/* Ore item */}
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-2">
                <Skeleton className="h-4 w-4 rounded bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-4 w-8 bg-gray-200 dark:bg-white/10" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      {/* Contatti section skeleton */}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-2">
                <Skeleton className="h-4 w-4 rounded bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-4 w-16 bg-gray-200 dark:bg-white/10" />
              </div>
            </SidebarMenuItem>
            <div className="pl-4 mt-1 space-y-1">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Skeleton className="h-3.5 w-3.5 rounded bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-3.5 w-14 bg-gray-200 dark:bg-white/10" />
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Skeleton className="h-3.5 w-3.5 rounded bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-3.5 w-16 bg-gray-200 dark:bg-white/10" />
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Skeleton className="h-3.5 w-3.5 rounded bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-3.5 w-20 bg-gray-200 dark:bg-white/10" />
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Skeleton className="h-3.5 w-3.5 rounded bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-3.5 w-24 bg-gray-200 dark:bg-white/10" />
              </div>
            </div>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );

  // Skeleton component for loading state - Footer
  const SidebarSkeletonFooter = () => (
    <div className="flex flex-col gap-2">
      {/* Theme switcher skeleton */}
      <div className="flex justify-start px-2 py-2">
        <Skeleton className="h-8 w-8 rounded-full bg-gray-200 dark:bg-white/10" />
      </div>
      {/* User section skeleton */}
      <div className="flex items-center gap-3 px-2 py-2 rounded-md">
        <Skeleton className="h-9 w-9 rounded-md shrink-0 bg-gray-200 dark:bg-white/10" />
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <Skeleton className="h-4 w-32 bg-gray-200 dark:bg-white/10" />
          <Skeleton className="h-3 w-24 bg-gray-200 dark:bg-white/10" />
          <Skeleton className="h-3 w-16 bg-gray-200 dark:bg-white/10" />
        </div>
        <Skeleton className="h-4 w-4 rounded shrink-0 bg-gray-200 dark:bg-white/10" />
      </div>
    </div>
  );

  const renderMenuItem = (item: MenuItem) => {
    // If item has subitems, use Collapsible
    if (item.items) {
      // Check if this is the Kanban menu for prefetch on hover
      const isKanbanMenu = item.key === "kanban";

      return (
        <Collapsible
          key={item.label}
          open={!collapsedMenus[item.label]}
          onOpenChange={() => toggleMenu(item.label)}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                tooltip={item.label}
                isActive={item.href ? isActive(item.href) : false}
                // Prefetch kanban data on hover before user clicks
                onMouseEnter={isKanbanMenu ? prefetchKanbanData : undefined}
              >
                {item.logoSrc ? (
                  <img
                    src={item.logoSrc}
                    alt={item.label}
                    className="h-5 w-5 shrink-0 rounded object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                ) : (
                  <FontAwesomeIcon
                    icon={iconMap[item.icon]}
                    className="w-4 h-4"
                  />
                )}
                <span>{item.label}</span>
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.items.map((subItem: MenuItem, index: number) => {
                  if (subItem.items) {
                    // Nested collapsible for third level
                    const LucideIcon = subItem.lucideIcon
                      ? getKanbanIcon(subItem.lucideIcon)
                      : null;
                    return (
                      <Collapsible
                        key={
                          subItem.id ||
                          subItem.href ||
                          `${subItem.label}-${index}`
                        }
                        open={!collapsedMenus[subItem.label]}
                        onOpenChange={() => toggleMenu(subItem.label)}
                        className="group/collapsible"
                      >
                        <SidebarMenuSubItem>
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
                            <SidebarMenuSub>
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
                        </SidebarMenuSubItem>
                      </Collapsible>
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
    return (
      <SidebarMenuItem key={item.label}>
        <SidebarMenuButton
          asChild={!!item.href && !item.action}
          tooltip={item.label}
          isActive={item.href ? isActive(item.href) : false}
          onClick={item.action}
        >
          {item.action ? (
            <div className="flex items-center gap-2 cursor-pointer">
              <FontAwesomeIcon icon={iconMap[item.icon]} className="w-4 h-4" />
              <span>{item.label}</span>
            </div>
          ) : (
            <Link href={item.href!}>
              <FontAwesomeIcon icon={iconMap[item.icon]} className="w-4 h-4" />
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

        {/* Overview Section - shows immediately with hydrated data or skeleton */}
        <SidebarGroup>
          <SidebarGroupLabel className="h-auto py-2">
            {isLoadingHeader ? (
              <Skeleton className="h-10 w-28 bg-gray-200 dark:bg-white/10" />
            ) : (
              <div className="flex items-center justify-between w-full gap-2">
                {siteImage ? (
                  <img
                    src={siteImage}
                    alt={displayTitle}
                    className="max-h-10 w-auto object-contain"
                    title={displayTitle}
                  />
                ) : (
                  <span className="truncate">{displayTitle}</span>
                )}
                <div className="flex items-center gap-1.5">
                  {domain && <CommandDeckLauncher domain={domain} />}
                  <QuickActions />
                </div>
              </div>
            )}
          </SidebarGroupLabel>

          {/* Home + Dashboard - show skeleton only if modules loading */}
          <SidebarGroupContent>
            <SidebarMenu>
              {domain && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t("nav.home")}
                    isActive={isActive(`${basePath}/home`)}
                  >
                    <Link href={`${basePath}/home`}>
                      <FontAwesomeIcon icon={faHouse} className="w-4 h-4" />
                      <span>{t("nav.home")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isLoadingMenuItems ? (
                <SidebarMenuItem>
                  <div className="flex items-center gap-2 px-2 py-2">
                    <Skeleton className="h-4 w-4 rounded bg-gray-200 dark:bg-white/10" />
                    <Skeleton className="h-4 w-20 bg-gray-200 dark:bg-white/10" />
                  </div>
                </SidebarMenuItem>
              ) : (
                groupedMenuItems.core.map(renderMenuItem)
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Show menu sections - with skeleton if loading */}
        {isLoadingMenuItems ? (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {[1, 2, 3].map((i) => (
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
          </>
        ) : (
          <>
            {/* Project Management (Kanban) */}
            {groupedMenuItems.projects.length > 0 && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {groupedMenuItems.projects.map(renderMenuItem)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}

            {/* Documenti */}
            {groupedMenuItems.documenti.length > 0 && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {groupedMenuItems.documenti.map(renderMenuItem)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}

            {/* Calendari */}
            {groupedMenuItems.calendars.length > 0 && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {groupedMenuItems.calendars.map(renderMenuItem)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}

            {/* Presenze */}
            {groupedMenuItems.attendance.length > 0 && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {groupedMenuItems.attendance.map(renderMenuItem)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}

            {/* Contacts */}
            {groupedMenuItems.contacts.length > 0 && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {groupedMenuItems.contacts.map(renderMenuItem)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}

            {/* Warehouse, Factory & Products */}
            {(groupedMenuItems.warehouse.length > 0 ||
              groupedMenuItems.factory.length > 0 ||
              groupedMenuItems.products.length > 0) && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {groupedMenuItems.warehouse.map(renderMenuItem)}
                      {groupedMenuItems.factory.map(renderMenuItem)}
                      {groupedMenuItems.products.map(renderMenuItem)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}

            {/* Projects */}
            {groupedMenuItems.projectsSection.length > 0 && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {groupedMenuItems.projectsSection.map(renderMenuItem)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}

            {/* Categories */}
            {groupedMenuItems.categories.length > 0 && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {groupedMenuItems.categories.map(renderMenuItem)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}

            {/* Others */}
            {groupedMenuItems.others.length > 0 && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {groupedMenuItems.others.map(renderMenuItem)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}

            {canManageSettings && settingsHref && (
              <>
                <SidebarSeparator />
                <SidebarGroup className="mt-auto">
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
              </>
            )}
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        {/* Footer loads progressively - theme switcher always visible */}
        <div className="flex flex-col gap-3">
          {/* Quick access icons for Ore, Errori, Reports */}
          {domain && (
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
