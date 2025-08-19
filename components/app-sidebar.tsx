"use client";
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  memo,
  useRef,
} from "react";
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
  SidebarRail,
} from "@/components/ui/sidebar";
import { useUserStore, UserDrawerType } from "@/store/zustand";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faWaveSquare,
  faWrench,
  faTable,
  faClock,
  faUser,
  faExclamation,
  faSquarePollVertical,
  faCheckSquare,
  faBox,
  faHelmetSafety,
  faUsers,
  faAngleDown,
  faAngleUp,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { usePathname } from "next/navigation";
import { NavUser } from "./nav-user";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import KanbanManagementModal from "./kanbans/KanbanManagementModal";
import { saveKanban } from "@/app/sites/[domain]/kanban/actions/save-kanban.action";
import { useToast } from "./ui/use-toast";
import { useKanbanStore } from "../store/kanban-store";
import { Kanban } from "../store/kanban-store";
import Link from "next/link";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { NetworkStatus } from "@/components/ui/network-status";
import { useSiteModules } from "@/hooks/use-site-modules";

// Cache for API responses
const apiCache = new Map<
  string,
  { data: any; timestamp: number; ttl: number }
>();

// Cache TTL values (in milliseconds)
const CACHE_TTL = {
  KANBANS: 5 * 60 * 1000, // 5 minutes
  USER_DATA: 10 * 60 * 1000, // 10 minutes
  ORGANIZATION: 30 * 60 * 1000, // 30 minutes
  SITE_NAME: 60 * 60 * 1000, // 1 hour
};

// Helper function to get cached data
const getCachedData = (key: string): any | null => {
  const cached = apiCache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    apiCache.delete(key);
    return null;
  }

  return cached.data;
};

// Helper function to set cached data
const setCachedData = (key: string, data: any, ttl: number): void => {
  apiCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
};

type menuItem = {
  label: string;
  icon: IconDefinition;
  href: string;
  alert: boolean;
  items?: menuItem[];
  customComponent?: React.ReactNode;
  moduleName?: string;
};

// Function to get menu items based on current context
const getMenuItems = (
  pathname: string,
  enabledModules: string[] = []
): menuItem[] => {
  // Check if we're on a site domain (sites/[domain] route)
  const isOnSiteDomain = pathname.includes("/sites/");

  // Extract domain from pathname if on site domain
  const domain = isOnSiteDomain
    ? pathname.split("/sites/")[1]?.split("/")[0]
    : null;

  // Base path for site-specific routes
  const basePath = isOnSiteDomain ? `/sites/${domain}` : "";

  const allSiteItems: menuItem[] = [
    {
      label: "Dashboard",
      icon: faWaveSquare,
      alert: true,
      href: `${basePath}/dashboard`,
      moduleName: "dashboard",
    },
    {
      label: "Kanban",
      icon: faTable,
      href: `${basePath}/kanban`,
      alert: true,
      moduleName: "kanban",
    },
    {
      label: "Progetti",
      icon: faTable,
      href: `${basePath}/projects`,
      alert: false,
      moduleName: "projects",
    },
    {
      label: "Calendario",
      icon: faClock,
      href: `${basePath}/calendar`,
      alert: false,
      moduleName: "calendar",
    },
    {
      label: "Clienti",
      icon: faUser,
      href: `${basePath}/clients`,
      alert: false,
      moduleName: "clients",
    },
    {
      label: "Errori",
      icon: faExclamation,
      href: `${basePath}/errortracking`,
      alert: false,
      moduleName: "errortracking",
    },
    {
      label: "Ore",
      icon: faClock,
      href: `${basePath}/timetracking`,
      alert: false,
      moduleName: "timetracking",
    },
    {
      label: "Reports",
      icon: faSquarePollVertical,
      href: `${basePath}/reports`,
      alert: false,
      moduleName: "reports",
      items: [
        {
          label: "Quality Control",
          icon: faCheckSquare,
          href: `${basePath}/qualityControl`,
          alert: false,
          moduleName: "qualitycontrol",
        },
        {
          label: "Effettua QC",
          icon: faCheckSquare,
          href: `${basePath}/qualityControl/edit`,
          alert: false,
          moduleName: "qualitycontrol",
        },
        {
          label: "Imballaggio",
          icon: faBox,
          href: `${basePath}/boxing`,
          alert: false,
          moduleName: "boxing",
        },
        {
          label: "Effettua imballaggio",
          icon: faBox,
          href: `${basePath}/boxing/edit`,
          alert: false,
          moduleName: "boxing",
        },
      ],
    },
    {
      label: "Inventario",
      icon: faBox,
      href: `${basePath}/inventory`,
      alert: false,
      moduleName: "inventory",
    },
    {
      label: "Prodotti",
      icon: faBox,
      href: `${basePath}/products`,
      alert: false,
      moduleName: "products",
    },
    {
      label: "Fornitori",
      icon: faHelmetSafety,
      href: `${basePath}/suppliers`,
      alert: false,
      moduleName: "suppliers",
    },
    {
      label: "Categorie",
      icon: faTable,
      href: `${basePath}/categories`,
      alert: false,
      moduleName: "categories",
    },
  ];

  // Filter items based on enabled modules
  const siteSpecificItems = allSiteItems.filter((item) => {
    if (item.moduleName) {
      return enabledModules.includes(item.moduleName);
    }
    if (item.items) {
      // For items with sub-items, check if any sub-item is enabled
      const enabledSubItems = item.items.filter(
        (subItem) =>
          subItem.moduleName && enabledModules.includes(subItem.moduleName)
      );
      if (enabledSubItems.length > 0) {
        // Return the parent item with only enabled sub-items
        return {
          ...item,
          items: enabledSubItems,
        };
      }
      return false;
    }
    return true; // Items without moduleName are always shown
  });

  // Add admin-only items if not on site domain
  if (!isOnSiteDomain) {
    siteSpecificItems.push(
      {
        label: "Utenti",
        icon: faUsers,
        href: "/users",
        alert: false,
      },
      {
        label: "Sites",
        icon: faTable,
        href: "/sites",
        alert: false,
      },
      {
        label: "Settings",
        icon: faWrench,
        href: "/settings",
        alert: false,
      }
    );
  }

  return siteSpecificItems;
};

const UserSection = memo(function UserSection({
  user,
}: {
  user: UserDrawerType;
}) {
  return <NavUser user={user} />;
});

export function AppSidebar() {
  const pathname = usePathname();
  const { user: userWithLocal, setUser } = useUserStore();
  const { kanbans, setKanbans } = useKanbanStore();
  const [collapsedMenus, setCollapsedMenus] = useState<{
    [key: string]: boolean;
  }>({});
  const [isLoadingKanbans, setIsLoadingKanbans] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [siteName, setSiteName] = useState<string>("");
  const { toast } = useToast();
  const { isOnline, lastOnlineTime } = useOnlineStatus();

  // Get domain for module filtering
  const isOnSiteDomain = pathname.includes("/sites/");
  const domain = isOnSiteDomain
    ? pathname.split("/sites/")[1]?.split("/")[0]
    : null;
  const { enabledModules } = useSiteModules(domain || "");

  // Function to fetch organization name (declared first)
  const fetchOrganizationName = useCallback(async (organizationId: string) => {
    const cacheKey = `organization_${organizationId}`;
    const cached = getCachedData(cacheKey);

    if (cached) {
      setOrganizationName(cached);
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        const orgName = data.organization?.name || "";
        setCachedData(cacheKey, orgName, CACHE_TTL.ORGANIZATION);
        setOrganizationName(orgName);
      }
    } catch (error) {
      console.error("Error fetching organization name:", error);
    }
  }, []);

  // Function to fetch user data (depends on fetchOrganizationName)
  const fetchUserData = useCallback(async () => {
    const cacheKey = "user_data";
    const cached = getCachedData(cacheKey);

    if (cached) {
      setUser(cached);
      if (cached.organizationId) {
        fetchOrganizationName(cached.organizationId);
      }
      return;
    }

    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      if (data.user) {
        setCachedData(cacheKey, data.user, CACHE_TTL.USER_DATA);
        setUser(data.user);
        if (data.organizationId) {
          fetchOrganizationName(data.organizationId);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, [fetchOrganizationName]);

  const fetchSiteName = useCallback(async (domain: string) => {
    const cacheKey = `site_name_${domain}`;
    const cached = getCachedData(cacheKey);

    if (cached) {
      setSiteName(cached);
      return;
    }

    try {
      const response = await fetch(`/api/sites/${domain}`);
      if (response.ok) {
        const data = await response.json();
        const siteName = data.name || domain;
        setCachedData(cacheKey, siteName, CACHE_TTL.SITE_NAME);
        setSiteName(siteName);
      }
    } catch (error) {
      setSiteName("");
    }
  }, []);

  // Single useEffect to handle all initial data fetching
  useEffect(() => {
    if (!userWithLocal) {
      fetchUserData();
    } else {
      // If user is already loaded, just fetch organization name if needed
      // Check if user has organization info in metadata
      const userOrgId = (userWithLocal as any)?.user_metadata?.organization_id;
      if (userOrgId && !organizationName) {
        fetchOrganizationName(userOrgId);
      }
    }
  }, [userWithLocal, fetchUserData, fetchOrganizationName, organizationName]);

  // Optimized kanban state management - separate from main sidebar state
  const [kanbansLocal, setKanbansLocal] = useState<Kanban[]>([]);
  const [isLoadingKanbansLocal, setIsLoadingKanbansLocal] = useState(false);
  const [lastSyncTimeLocal, setLastSyncTimeLocal] = useState<Date | null>(null);

  // Separate kanban fetching that doesn't trigger sidebar re-renders
  const fetchKanbansOptimized = useCallback(async () => {
    const cacheKey = "kanbans_list";
    const cached = getCachedData(cacheKey);

    if (cached) {
      setKanbansLocal(cached);
      return cached;
    }

    try {
      const response = await fetch("/api/kanban/list");
      if (!response.ok) throw new Error("Failed to fetch kanbans");
      const data = await response.json();
      const kanbanData = Array.isArray(data) ? data : [];

      setCachedData(cacheKey, kanbanData, CACHE_TTL.KANBANS);
      setKanbansLocal(kanbanData);
      setLastSyncTimeLocal(new Date());

      return kanbanData;
    } catch (error) {
      console.error("Error fetching kanbans:", error);
      setKanbansLocal([]);
      return [];
    }
  }, []);

  // Initialize kanbans on mount without triggering sidebar re-render
  useEffect(() => {
    if (kanbansLocal.length === 0 && isOnline) {
      setIsLoadingKanbansLocal(true);
      fetchKanbansOptimized().finally(() => {
        setIsLoadingKanbansLocal(false);
      });
    }
  }, [kanbansLocal.length, isOnline, fetchKanbansOptimized]);

  // Optimized refresh function that only updates kanbans locally
  const refreshKanbansOptimized = useCallback(async () => {
    if (!isOnline) {
      toast({
        title: "Impossibile aggiornare",
        description: "Nessuna connessione internet disponibile",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingKanbansLocal(true);
    try {
      const response = await fetch("/api/kanban/list");
      if (!response.ok) throw new Error("Failed to fetch kanbans");
      const data = await response.json();
      const kanbanData = Array.isArray(data) ? data : [];

      // Update cache with fresh data
      setCachedData("kanbans_list", kanbanData, CACHE_TTL.KANBANS);
      setKanbansLocal(kanbanData);
      setLastSyncTimeLocal(new Date());

      toast({
        title: "Aggiornamento completato",
        description: "Lista kanban aggiornata con successo",
      });
    } catch (error) {
      console.error("Error refreshing kanbans:", error);
      setKanbansLocal([]);
      toast({
        title: "Errore nell'aggiornamento",
        description: "Impossibile aggiornare la lista kanban",
        variant: "destructive",
      });
    } finally {
      setIsLoadingKanbansLocal(false);
    }
  }, [isOnline, toast]);

  // Reduced periodic refresh frequency - only check every 5 minutes
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      // Only refresh if we haven't refreshed in the last 15 minutes
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (!lastSyncTimeLocal || lastSyncTimeLocal < fifteenMinutesAgo) {
        refreshKanbansOptimized();
      }
    }, 300000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [isOnline, lastSyncTimeLocal, refreshKanbansOptimized]);

  // Handle online/offline status changes
  useEffect(() => {
    if (isOnline && lastOnlineTime) {
      // Just came back online, refresh kanbans
      refreshKanbansOptimized();
      toast({
        title: "Connessione ripristinata",
        description: "I dati sono stati aggiornati automaticamente",
      });
    }
  }, [isOnline, lastOnlineTime, refreshKanbansOptimized]);

  // If on a site domain, fetch site name
  useEffect(() => {
    const isOnSiteDomain = pathname.includes("/sites/");
    if (isOnSiteDomain) {
      const domain = pathname.split("/sites/")[1]?.split("/")[0];
      if (domain) {
        fetchSiteName(domain);
      }
    }
  }, [pathname, fetchSiteName]);

  const isActive = useCallback(
    (href: string) => {
      // Handle query parameters
      const [path, query] = href.split("?");
      const [currentPath, currentQuery] = pathname.split("?");

      // If the href has query parameters, check both path and query
      if (query) {
        return path === currentPath && query === currentQuery;
      }

      // Otherwise just check the path
      return pathname === href;
    },
    [pathname]
  );

  const menuItems = useMemo(() => {
    const items = getMenuItems(
      pathname,
      enabledModules.map((m) => m.name)
    );

    return items.map((item: menuItem) => {
      if (item.label === "Kanban") {
        // Get the base path for kanban routes
        const isOnSiteDomain = pathname.includes("/sites/");
        const domain = isOnSiteDomain
          ? pathname.split("/sites/")[1]?.split("/")[0]
          : null;
        const basePath = isOnSiteDomain ? `/sites/${domain}` : "";

        // Create kanban submenu items
        const kanbanSubItems = [
          ...(isLoadingKanbansLocal
            ? [
                {
                  label: "Caricamento...",
                  icon: faWrench,
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
                  icon: faTable,
                  href: "#",
                  alert: false,
                },
              ]
            : kanbansLocal.map((kanban) => ({
                label: kanban.title,
                icon: faTable,
                href: `${basePath}/kanban?name=${kanban.identifier}`,
                alert: false,
              }))),
          {
            label: "Gestisci Kanban",
            icon: faPlus,
            href: "#",
            alert: false,
          },
        ];

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
    kanbansLocal,
    isLoadingKanbansLocal,
    isOnline,
    refreshKanbansOptimized,
  ]);

  const toggleMenu = useCallback((label: string) => {
    setCollapsedMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  }, []);

  const handleSaveKanban = async (kanbanData: Kanban) => {
    try {
      await saveKanban(kanbanData);
      await refreshKanbansOptimized();
      toast({
        title: "Successo",
        description: "Kanban salvato correttamente",
      });
    } catch (error) {
      console.error("Error saving kanban:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description:
          "Si è verificato un errore durante il salvataggio del kanban",
      });
    }
  };

  // Cleanup function to clear cache when needed
  const clearCache = useCallback(() => {
    apiCache.clear();
  }, []);

  // Clear cache when user changes or component unmounts
  useEffect(() => {
    return () => {
      clearCache();
    };
  }, [clearCache]);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {organizationName && siteName
              ? `${organizationName} - ${siteName}`
              : organizationName || "Organization"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item: menuItem) => (
                <React.Fragment key={item.label}>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild={!item.items}
                      isActive={isActive(item.href)}
                      className={
                        isActive(item.href)
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : ""
                      }
                      onClick={
                        item.items ? () => toggleMenu(item.label) : undefined
                      }
                    >
                      {item.items ? (
                        <>
                          <FontAwesomeIcon icon={item.icon} />
                          <span>{item.label}</span>
                          <FontAwesomeIcon
                            icon={
                              collapsedMenus[item.label]
                                ? faAngleUp
                                : faAngleDown
                            }
                            className="ml-auto"
                          />
                        </>
                      ) : (
                        <Link href={item.href}>
                          <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={item.icon} />
                            <span>{item.label}</span>
                          </div>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {item.items && !collapsedMenus[item.label] && (
                    <div className="pl-4">
                      {item.items.map((subItem: menuItem) => (
                        <SidebarMenuItem key={subItem.label}>
                          {subItem.customComponent ? (
                            <KanbanManagementModal
                              onSave={handleSaveKanban}
                              trigger={
                                <div className="w-full flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-accent rounded-sm">
                                  <FontAwesomeIcon icon={subItem.icon} />
                                  <span>{subItem.label}</span>
                                </div>
                              }
                            />
                          ) : (
                            <SidebarMenuButton
                              asChild
                              isActive={isActive(subItem.href)}
                              className={
                                isActive(subItem.href)
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                  : ""
                              }
                            >
                              <Link href={subItem.href}>
                                <div className="flex items-center gap-2">
                                  <FontAwesomeIcon icon={subItem.icon} />
                                  <span>{subItem.label}</span>
                                </div>
                              </Link>
                            </SidebarMenuButton>
                          )}
                        </SidebarMenuItem>
                      ))}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col gap-2">
          {/* Network Status Indicator */}
          <div className="px-2 py-1">
            <NetworkStatus size="sm" />
          </div>
          <div className="flex items-start">
            <ThemeSwitcher />
          </div>
          {userWithLocal && <UserSection user={userWithLocal} />}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
