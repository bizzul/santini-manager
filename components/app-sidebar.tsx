"use client";
import React, { useState, useMemo, useCallback, memo } from "react";
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
import { usePathname } from "next/navigation";
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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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

// Fetch functions for React Query
async function fetchSiteData(domain: string) {
  const response = await fetch(`/api/sites/${domain}`);
  if (!response.ok) throw new Error("Failed to fetch site data");
  const data = await response.json();
  return {
    name: data.name || domain,
    image: data.image || null,
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
  basePath: string = ""
): MenuItem[] => {
  const allSiteItems: MenuItem[] = [
    {
      label: "Dashboard",
      icon: "faWaveSquare",
      alert: true,
      href: `${basePath}/dashboard`,
      moduleName: "dashboard",
    },
    {
      label: "Kanban",
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
      label: "Articoli",
      icon: "faBox",
      href: `${basePath}/products`,
      alert: false,
      moduleName: "products",
    },
    {
      label: "Progetti",
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
          label: "Articoli",
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
      label: "Reports",
      icon: "faSquarePollVertical",
      href: `${basePath}/reports`,
      alert: false,
      moduleName: "reports",
      items: [
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
    if (!item.moduleName) return true;

    if (enabledModules.includes(item.moduleName)) {
      // If item has sub-items, filter them too
      if (item.items) {
        const enabledSubItems = item.items.filter(
          (subItem) =>
            subItem.moduleName && enabledModules.includes(subItem.moduleName)
        );
        if (enabledSubItems.length > 0) {
          item.items = enabledSubItems;
          return true;
        }
        return false;
      }
      return true;
    }
    return false;
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

const UserSection = memo(function UserSection({ user }: { user: UserContext }) {
  return <NavUser user={user} />;
});

export function AppSidebar() {
  const pathname = usePathname();
  const { userContext } = useUserContext();
  const { openCreateModal } = useKanbanModal();
  // Initialize Kanban as collapsed by default - data will be fetched on expand
  const [collapsedMenus, setCollapsedMenus] = useState<Record<string, boolean>>(
    { Kanban: true }
  );
  const { toast } = useToast();
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();

  // Track if Kanban section has been opened at least once (for lazy loading)
  const [kanbanOpened, setKanbanOpened] = useState(false);

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
      basePath
    );

    return items.map((item: MenuItem) => {
      if (item.label === "Kanban") {
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
    kanbansLocal,
    kanbanCategories,
    isLoadingKanbansLocal,
    isOnline,
    userContext,
    openCreateModal,
  ]);

  // Optimized utility functions
  const isActive = useCallback(
    (href: string) => {
      const [path] = href.split("?");
      const [currentPath] = pathname.split("?");
      return pathname === href || currentPath === path;
    },
    [pathname]
  );

  const toggleMenu = useCallback((label: string) => {
    setCollapsedMenus((prev) => {
      const wasCollapsed = prev[label];
      // If opening Kanban section, mark it as opened for lazy loading
      if (label === "Kanban" && wasCollapsed) {
        setKanbanOpened(true);
      }
      return {
        ...prev,
        [label]: !wasCollapsed,
      };
    });
  }, []);

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

  // Raggruppa i menu items per categoria
  const groupedMenuItems = useMemo(() => {
    const core = menuItems.filter((item) => item.label === "Dashboard");
    const projects = menuItems.filter((item) => item.label === "Kanban");
    const calendars = menuItems.filter((item) => item.label === "Calendari");
    const time = menuItems.filter((item) => item.label === "Ore");
    const contacts = menuItems.filter((item) => item.label === "Contatti");
    const warehouse = menuItems.filter((item) => item.label === "Magazzino");
    const products = menuItems.filter((item) => item.label === "Articoli");
    const projectsSection = menuItems.filter(
      (item) => item.label === "Progetti"
    );
    const categories = menuItems.filter((item) => item.label === "Categorie");
    const others = menuItems.filter(
      (item) =>
        ![
          "Dashboard",
          "Kanban",
          "Calendari",
          "Ore",
          "Contatti",
          "Magazzino",
          "Articoli",
          "Progetti",
          "Categorie",
        ].includes(item.label)
    );

    return {
      core,
      projects,
      calendars,
      time,
      contacts,
      warehouse,
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
      const isKanbanMenu = item.label === "Kanban";

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
                      {groupedMenuItems.time.map(renderMenuItem)}
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

            {/* Warehouse & Products */}
            {(groupedMenuItems.warehouse.length > 0 ||
              groupedMenuItems.products.length > 0) && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {groupedMenuItems.warehouse.map(renderMenuItem)}
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
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        {/* Footer loads progressively - theme switcher always visible */}
        <div className="flex flex-col gap-2">
          <ThemeSwitcher />
          {userContext ? (
            <UserSection user={userContext} />
          ) : (
            /* Show skeleton only while user context is loading */
            <div className="flex items-center gap-3 px-2 py-2 rounded-md">
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
