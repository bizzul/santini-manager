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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Settings, ShieldCheck } from "lucide-react";
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
import { getKanbanIcon } from "@/lib/kanban-icons";
import { cn } from "@/lib/utils";

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
};

type SiteDataQueryResult = {
  id: string;
  name: string;
  image: string | null;
  verticalProfile?: unknown;
  organization: { name: string };
};

// Fetch functions for React Query
async function fetchSiteData(domain: string): Promise<SiteDataQueryResult> {
  const response = await fetch(`/api/sites/${domain}`);
  if (!response.ok) throw new Error("Failed to fetch site data");
  const data = await response.json();
  return {
    id: data.id,
    name: data.name || domain,
    image: data.image || null,
    verticalProfile: data.verticalProfile || null,
    organization: { name: data.organization?.name || "" },
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
  labels?: {
    kanban?: string;
    projects?: string;
    reports?: string;
  }
): MenuItem[] => {
  const allSiteItems: MenuItem[] = [
    {
      label: "Dashboard",
      icon: "faWaveSquare",
      alert: true,
      moduleName: "dashboard",
      items: [
        {
          label: "Overview",
          icon: "faWaveSquare",
          href: `${basePath}/dashboard`,
          alert: false,
          moduleName: "dashboard",
        },
        {
          label: "Forecast",
          icon: "faSquarePollVertical",
          href: `${basePath}/dashboard/forecast`,
          alert: false,
          moduleName: "dashboard-forecast",
        },
      ],
    },
    {
      label: labels?.kanban || "Kanban",
      icon: "faTable",
      alert: true,
      moduleName: "kanban",
      items: [
        {
          label: "Kanban Ufficio",
          icon: "faBriefcase",
          href: `${basePath}/kanban?type=office`,
          alert: false,
          moduleName: "kanban",
        },
        {
          label: "Kanban Produzione",
          icon: "faIndustry",
          href: `${basePath}/kanban?type=production`,
          alert: false,
          moduleName: "kanban",
        },
      ],
    },
    {
      label: "Calendari",
      icon: "faCalendarDays",
      alert: false,
      items: [
        {
          label: "Produzione",
          icon: "faCalendarCheck",
          href: `${basePath}/calendar`,
          alert: false,
          moduleName: "calendar",
        },
        {
          label: "Posa",
          icon: "faCalendarDays",
          href: `${basePath}/calendar-installation`,
          alert: false,
          moduleName: "calendar",
        },
        {
          label: "Service",
          icon: "faCalendarDays",
          href: `${basePath}/calendar-service`,
          alert: false,
          moduleName: "calendar",
        },
      ],
    },
    {
      label: "Ore",
      icon: "faClock",
      href: `${basePath}/timetracking`,
      alert: false,
      moduleName: "timetracking",
    },
    {
      label: "Presenze",
      icon: "faCalendarCheck",
      href: `${basePath}/attendance`,
      alert: false,
      moduleName: "attendance",
    },
    {
      label: "Contatti",
      icon: "faUsers",
      alert: false,
      items: [
        {
          label: "Clienti",
          icon: "faUser",
          href: `${basePath}/clients`,
          alert: false,
          moduleName: "clients",
        },
        {
          label: "Fornitori",
          icon: "faHelmetSafety",
          href: `${basePath}/suppliers`,
          alert: false,
          moduleName: "suppliers",
        },
        {
          label: "Produttori",
          icon: "faIndustry",
          href: `${basePath}/manufacturers`,
          alert: false,
          moduleName: "manufacturers",
        },
        {
          label: "Collaboratori",
          icon: "faUserTie",
          href: `${basePath}/collaborators`,
          alert: false,
          moduleName: "collaborators",
        },
      ],
    },
    {
      label: "Magazzino",
      icon: "faWarehouse",
      alert: false,
      moduleName: "inventory",
      href: `${basePath}/inventory`,
    },
    {
      label: "Fabbrica",
      icon: "faIndustry",
      alert: false,
      moduleName: "factory",
      href: `${basePath}/factory`,
    },
    {
      label: "Prodotti",
      icon: "faBox",
      href: `${basePath}/products`,
      alert: false,
      moduleName: "products",
    },
    {
      label: labels?.projects || "Progetti",
      icon: "faTable",
      href: `${basePath}/projects`,
      alert: false,
      moduleName: "projects",
    },
    {
      label: "Categorie",
      icon: "faListUl",
      alert: false,
      items: [
        {
          label: "Inventario",
          icon: "faListUl",
          href: `${basePath}/categories`,
          alert: false,
          moduleName: "categories",
        },
        {
          label: "Prodotti",
          icon: "faListUl",
          href: `${basePath}/product-categories`,
          alert: false,
          moduleName: "products",
        },
        {
          label: "Fornitori",
          icon: "faListUl",
          href: `${basePath}/supplier-categories`,
          alert: false,
          moduleName: "suppliers",
        },
        {
          label: "Produttori",
          icon: "faListUl",
          href: `${basePath}/manufacturer-categories`,
          alert: false,
          moduleName: "manufacturers",
        },
      ],
    },
    {
      label: "Errori",
      icon: "faExclamation",
      href: `${basePath}/errortracking`,
      alert: false,
      moduleName: "errortracking",
    },
    {
      label: labels?.reports || "Reports",
      icon: "faSquarePollVertical",
      href: `${basePath}/reports`,
      alert: false,
      // Show Reports menu if any report module is enabled (no main module, just alternatives)
      alternativeModules: ["report-time", "report-inventory", "report-projects", "report-errors", "report-imb"],
      items: [
        {
          label: "Report Ore",
          icon: "faClock",
          href: `${basePath}/reports`,
          alert: false,
          moduleName: "report-time",
        },
        {
          label: "Report Inventario",
          icon: "faWarehouse",
          href: `${basePath}/reports`,
          alert: false,
          moduleName: "report-inventory",
        },
        {
          label: "Report Progetti",
          icon: "faTable",
          href: `${basePath}/reports`,
          alert: false,
          moduleName: "report-projects",
        },
        {
          label: "Report Errori",
          icon: "faExclamation",
          href: `${basePath}/reports`,
          alert: false,
          moduleName: "report-errors",
        },
        {
          label: "Report Imballaggio",
          icon: "faBox",
          href: `${basePath}/reports`,
          alert: false,
          moduleName: "report-imb",
        },
        {
          label: "Quality Control",
          icon: "faCheckSquare",
          href: `${basePath}/qualityControl`,
          alert: false,
          moduleName: "qualitycontrol",
        },
        {
          label: "Effettua QC",
          icon: "faCheckSquare",
          href: `${basePath}/qualityControl/edit`,
          alert: false,
          moduleName: "qualitycontrol",
        },
        {
          label: "Imballaggio",
          icon: "faBox",
          href: `${basePath}/boxing`,
          alert: false,
          moduleName: "boxing",
        },
        {
          label: "Effettua imballaggio",
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
        label: "Utenti",
        icon: "faUsers",
        href: "/administration/users",
        alert: false,
      },
      {
        label: "Sites",
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
  // Initialize collapsed menus from localStorage (with Kanban collapsed by default)
  const [collapsedMenus, setCollapsedMenus] = useState<Record<string, boolean>>(
    getInitialCollapsedMenus
  );
  const { toast } = useToast();
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();

  // Track if Kanban section has been opened at least once (for lazy loading)
  const [kanbanOpened, setKanbanOpened] = useState(getInitialKanbanOpened);

  // Persist collapsed menus state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        SIDEBAR_COLLAPSED_MENUS_KEY,
        JSON.stringify(collapsedMenus)
      );
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [collapsedMenus]);

  // Persist kanban opened state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        SIDEBAR_KANBAN_OPENED_KEY,
        JSON.stringify(kanbanOpened)
      );
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [kanbanOpened]);

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
      verticalProfile.menuLabels
    );

    return items.map((item: MenuItem) => {
      if (item.label === verticalProfile.menuLabels.kanban) {
        const isSuperAdmin = userContext?.role === "superadmin";

        // Se non ci sono categorie, mostra tutte le kanban senza raggruppamento
        if (kanbanCategories.length === 0) {
          const kanbanSubItems = [
            ...(isLoadingKanbansLocal
              ? [
                  {
                    label: "Caricamento...",
                    icon: "faWrench" as const,
                    href: "#",
                    alert: false,
                  },
                ]
              : kanbansLocal.length === 0
              ? [
                  {
                    label: isOnline
                      ? "Nessun kanban disponibile"
                      : "Dati non disponibili offline",
                    icon: "faTable" as const,
                    href: "#",
                    alert: false,
                  },
                ]
              : kanbansLocal.map((kanban) => ({
                  label: kanban.title,
                  icon: "faTable" as const,
                  lucideIcon: kanban.icon || "Folder",
                  href: `${basePath}/kanban?name=${kanban.identifier}`,
                  alert: false,
                  id: kanban.id || kanban.identifier,
                }))),
            ...(isSuperAdmin
              ? [
                  {
                    label: "Crea Kanban",
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
                      label: "Caricamento...",
                      icon: "faWrench" as const,
                      href: "#",
                      alert: false,
                    },
                  ]
                : categoryKanbans.length === 0
                ? [
                    {
                      label: isOnline
                        ? "Nessun kanban disponibile"
                        : "Dati non disponibili offline",
                      icon: "faTable" as const,
                      href: "#",
                      alert: false,
                    },
                  ]
                : categoryKanbans.map((kanban) => ({
                    label: kanban.title,
                    icon: "faTable" as const,
                    lucideIcon: kanban.icon || "Folder",
                    href: `${basePath}/kanban?name=${kanban.identifier}&category=${category.identifier}`,
                    alert: false,
                    id: kanban.id || kanban.identifier,
                  }))),
              ...(isSuperAdmin
                ? [
                    {
                      label: "Crea Kanban",
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
            label: "Senza Categoria",
            icon: "faListUl" as const,
            lucideIcon: "Folder",
            color: "#6B7280",
            alert: false,
            items: [
              ...(isLoadingKanbansLocal
                ? [
                    {
                      label: "Caricamento...",
                      icon: "faWrench" as const,
                      href: "#",
                      alert: false,
                    },
                  ]
                : uncategorizedKanbans.length === 0
                ? []
                : uncategorizedKanbans.map((kanban) => ({
                    label: kanban.title,
                    icon: "faTable" as const,
                    lucideIcon: kanban.icon || "Folder",
                    href: `${basePath}/kanban?name=${kanban.identifier}`,
                    alert: false,
                    id: kanban.id || kanban.identifier,
                  }))),
              ...(isSuperAdmin
                ? [
                    {
                      label: "Crea Kanban",
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
    verticalProfile,
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
      if (label === verticalProfile.menuLabels.kanban && wasCollapsed) {
        setKanbanOpened(true);
      }
      return {
        ...prev,
        [label]: !wasCollapsed,
      };
    });
  }, [verticalProfile]);

  // Optimized display values
  const displayTitle = useMemo(() => {
    if (siteData) {
      return siteData.organization.name
        ? `${siteData.organization.name} - ${siteData.name}`
        : siteData.name;
    }
    return "Organization";
  }, [siteData]);

  const siteImage = useMemo(() => siteData?.image || null, [siteData]);
  const canManageSettings =
    userContext?.role === "admin" || userContext?.role === "superadmin";
  const settingsHref = useMemo(() => {
    if (!canManageSettings) return null;
    if (domain) {
      return siteData?.id ? `/administration/sites/${siteData.id}/edit` : null;
    }
    return "/administration";
  }, [canManageSettings, domain, siteData?.id]);
  const settingsTitle = domain ? "Impostazioni sito" : "Administration";
  const settingsDescription = domain
    ? "Configura moduli, categorie e parametri operativi del sito."
    : "Gestisci configurazioni e impostazioni generali della piattaforma.";

  // Raggruppa i menu items per categoria
  const groupedMenuItems = useMemo(() => {
    const kanbanLabel = verticalProfile.menuLabels.kanban;
    const projectsLabel = verticalProfile.menuLabels.projects;
    const reportsLabel = verticalProfile.menuLabels.reports;
    const core = menuItems.filter((item) => item.label === "Dashboard");
    const projects = menuItems.filter((item) => item.label === kanbanLabel);
    const calendars = menuItems.filter((item) => item.label === "Calendari");
    const contacts = menuItems.filter((item) => item.label === "Contatti");
    const warehouse = menuItems.filter((item) => item.label === "Magazzino");
    const factory = menuItems.filter((item) => item.label === "Fabbrica");
    const products = menuItems.filter((item) => item.label === "Prodotti");
    const projectsSection = menuItems.filter(
      (item) => item.label === projectsLabel
    );
    const categories = menuItems.filter((item) => item.label === "Categorie");
    const attendance = menuItems.filter((item) => item.label === "Presenze");
    const others = menuItems.filter(
      (item) =>
        ![
          "Dashboard",
          kanbanLabel,
          "Calendari",
          "Ore",
          "Presenze",
          "Contatti",
          "Magazzino",
          "Fabbrica",
          "Prodotti",
          projectsLabel,
          "Categorie",
          "Errori",
          reportsLabel,
        ].includes(item.label)
    );

    return {
      core,
      projects,
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
  }, [menuItems, verticalProfile]);

  // Progressive loading: separate loading states for different parts
  // Header/footer load from hydration, so usually instant
  const isLoadingHeader = useMemo(() => {
    if (!domain) return false;
    return loadingSiteData;
  }, [domain, loadingSiteData]);

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
      const isKanbanMenu = item.label === verticalProfile.menuLabels.kanban;

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
                <FontAwesomeIcon
                  icon={iconMap[item.icon]}
                  className="w-4 h-4"
                />
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
                <QuickActions />
              </div>
            )}
          </SidebarGroupLabel>

          {/* Dashboard - show skeleton only if modules loading */}
          <SidebarGroupContent>
            <SidebarMenu>
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

            {state !== "collapsed" && (
              <>
                <SidebarSeparator />
                <SidebarGroup className="mt-auto flex-1">
                  <SidebarGroupLabel>Impostazioni</SidebarGroupLabel>
                  <SidebarGroupContent className="flex flex-1 flex-col">
                    <div className="flex flex-1 flex-col gap-4">
                      <div className="flex flex-1 flex-col rounded-2xl border border-[hsl(var(--sidebar-border)/0.75)] bg-[hsl(var(--sidebar-card)/0.72)] p-4 shadow-[inset_0_1px_0_hsl(var(--sidebar-card)/0.55)] dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--sidebar-card))] text-[hsl(var(--sidebar-foreground))] shadow-[0_10px_20px_hsl(var(--sidebar-card-shadow)/0.1)] dark:bg-white/10 dark:text-white dark:shadow-none">
                          <Settings className="h-5 w-5" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-[hsl(var(--sidebar-foreground))] dark:text-white">
                            {settingsTitle}
                          </p>
                          <p className="text-xs leading-5 text-[hsl(var(--sidebar-foreground)/0.62)] dark:text-white/60">
                            {settingsDescription}
                          </p>
                        </div>
                        <div className="mt-auto pt-4">
                          {settingsHref ? (
                            <SidebarMenu>
                              <SidebarMenuItem>
                                <SidebarMenuButton
                                  asChild
                                  className="h-10 rounded-xl bg-[hsl(var(--sidebar-card-strong)/0.9)] shadow-[0_8px_18px_hsl(var(--sidebar-card-shadow)/0.12)] dark:bg-white/10 dark:shadow-none"
                                >
                                  <Link href={settingsHref}>
                                    <ShieldCheck className="h-4 w-4" />
                                    <span>Apri impostazioni</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            </SidebarMenu>
                          ) : (
                            <div className="rounded-xl border border-dashed border-[hsl(var(--sidebar-border)/0.8)] px-3 py-2 text-xs text-[hsl(var(--sidebar-foreground)/0.62)] dark:border-white/10 dark:text-white/60">
                              Disponibile per admin e superadmin.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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
                "rounded-2xl border border-[hsl(var(--sidebar-border)/0.8)] bg-[hsl(var(--sidebar-card)/0.9)] py-2 shadow-[0_10px_24px_hsl(var(--sidebar-card-shadow)/0.12)] dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none",
                state === "collapsed"
                  ? "flex-col gap-1 justify-center px-0"
                  : "flex-row justify-around px-2"
              )}
            >
              {enabledModules.some((m) => m.name === "timetracking") && (
                <Link
                  href={`${basePath}/timetracking`}
                  title="Ore"
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
                  title="Errori"
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
                  title="Reports"
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
