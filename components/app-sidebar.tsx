"use client";
import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
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
import { useUserContext } from "@/hooks/use-user-context";
import { UserContext } from "@/lib/auth-utils";
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
import { useKanbanModal } from "@/components/kanbans/KanbanModalContext";
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
} from "@fortawesome/free-solid-svg-icons";

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
};

// Cache for API responses with improved TTL management
const apiCache = new Map<
  string,
  { data: any; timestamp: number; ttl: number }
>();

// Optimized cache TTL values
const CACHE_TTL = {
  KANBANS: 5 * 60 * 1000, // 5 minutes
  USER_DATA: 10 * 60 * 1000, // 10 minutes
  ORGANIZATION: 30 * 60 * 1000, // 30 minutes
  SITE_DATA: 15 * 60 * 1000, // 15 minutes (reduced from 1 hour)
};

// Enhanced cache management
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

const setCachedData = (key: string, data: any, ttl: number): void => {
  apiCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
};

// Clear expired cache entries periodically
const cleanupCache = () => {
  const now = Date.now();
  apiCache.forEach((value, key) => {
    if (now - value.timestamp > value.ttl) {
      apiCache.delete(key);
    }
  });
};

// Run cache cleanup every 5 minutes
setInterval(cleanupCache, 5 * 60 * 1000);

type MenuItem = {
  label: string;
  icon: keyof typeof iconMap;
  href?: string;
  action?: () => void;
  alert: boolean;
  items?: MenuItem[];
  customComponent?: React.ReactNode;
  moduleName?: string;
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
      href: `${basePath}/kanban`,
      alert: true,
      moduleName: "kanban",
    },
    {
      label: "Progetti",
      icon: "faTable",
      href: `${basePath}/projects`,
      alert: false,
      moduleName: "projects",
    },
    {
      label: "Calendario",
      icon: "faClock",
      href: `${basePath}/calendar`,
      alert: false,
      moduleName: "calendar",
    },
    {
      label: "Clienti",
      icon: "faUser",
      href: `${basePath}/clients`,
      alert: false,
      moduleName: "clients",
    },
    {
      label: "Errori",
      icon: "faExclamation",
      href: `${basePath}/errortracking`,
      alert: false,
      moduleName: "errortracking",
    },
    {
      label: "Ore",
      icon: "faClock",
      href: `${basePath}/timetracking`,
      alert: false,
      moduleName: "timetracking",
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
    {
      label: "Inventario",
      icon: "faBox",
      href: `${basePath}/inventory`,
      alert: false,
      moduleName: "inventory",
    },
    {
      label: "Prodotti",
      icon: "faBox",
      href: `${basePath}/products`,
      alert: false,
      moduleName: "products",
    },
    {
      label: "Fornitori",
      icon: "faHelmetSafety",
      href: `${basePath}/suppliers`,
      alert: false,
      moduleName: "suppliers",
    },
    {
      label: "Categorie",
      icon: "faTable",
      href: `${basePath}/categories`,
      alert: false,
      moduleName: "categories",
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
  const [collapsedMenus, setCollapsedMenus] = useState<Record<string, boolean>>(
    {}
  );
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [siteData, setSiteData] = useState<{
    name: string;
    organization: { name: string };
  } | null>(null);
  const { toast } = useToast();
  const { isOnline, lastOnlineTime } = useOnlineStatus();

  // Optimized domain extraction
  const domain = useMemo(() => extractDomainFromPath(pathname), [pathname]);
  const basePath = useMemo(() => (domain ? `/sites/${domain}` : ""), [domain]);

  // Enhanced site modules hook usage
  const { enabledModules } = useSiteModules(domain || "");

  // Optimized data fetching functions
  const fetchSiteData = useCallback(async (domain: string) => {
    const cacheKey = `site_data_${domain}`;
    const cached = getCachedData(cacheKey);

    if (cached) {
      setSiteData(cached);
      return;
    }

    try {
      const response = await fetch(`/api/sites/${domain}`);
      if (response.ok) {
        const data = await response.json();
        const siteInfo = {
          name: data.name || domain,
          organization: { name: data.organization?.name || "" },
        };
        setCachedData(cacheKey, siteInfo, CACHE_TTL.SITE_DATA);
        setSiteData(siteInfo);
      }
    } catch (error) {
      console.error("Error fetching site data:", error);
      setSiteData(null);
    }
  }, []);

  // Optimized kanban management
  const [kanbansLocal, setKanbansLocal] = useState<Kanban[]>([]);
  const [isLoadingKanbansLocal, setIsLoadingKanbansLocal] = useState(false);

  const fetchKanbansOptimized = useCallback(async () => {
    if (!domain) return [];

    const cacheKey = `kanbans_list_${domain}`;
    const cached = getCachedData(cacheKey);

    if (cached) {
      setKanbansLocal(cached);
      return cached;
    }

    try {
      const response = await fetch(
        `/api/kanban/list?domain=${encodeURIComponent(domain)}`,
        {
          headers: {
            host: domain,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch kanbans");
      const data = await response.json();
      const kanbanData = Array.isArray(data) ? data : [];

      setCachedData(cacheKey, kanbanData, CACHE_TTL.KANBANS);
      setKanbansLocal(kanbanData);
      setLastSyncTime(new Date());

      return kanbanData;
    } catch (error) {
      console.error("Error fetching kanbans:", error);
      setKanbansLocal([]);
      return [];
    }
  }, [domain]);

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

    setIsLoadingKanbansLocal(true);
    try {
      const response = await fetch(
        `/api/kanban/list?domain=${encodeURIComponent(domain)}`,
        {
          headers: {
            host: domain,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch kanbans");
      const data = await response.json();
      const kanbanData = Array.isArray(data) ? data : [];

      setCachedData(`kanbans_list_${domain}`, kanbanData, CACHE_TTL.KANBANS);
      setKanbansLocal(kanbanData);
      setLastSyncTime(new Date());

      toast({
        title: "Aggiornamento completato",
        description: "Lista kanban aggiornata con successo",
      });
    } catch (error) {
      console.error("Error refreshing kanbans:", error);
      toast({
        title: "Errore nell'aggiornamento",
        description: "Impossibile aggiornare la lista kanban",
        variant: "destructive",
      });
    } finally {
      setIsLoadingKanbansLocal(false);
    }
  }, [isOnline, toast, domain]);

  // Optimized effects
  useEffect(() => {
    if (!userContext) {
      // No fetchUserData needed as userContext is now directly available
    }
  }, [userContext]);

  useEffect(() => {
    if (domain) {
      fetchSiteData(domain);
    }
  }, [domain, fetchSiteData]);

  useEffect(() => {
    if (kanbansLocal.length === 0 && isOnline) {
      setIsLoadingKanbansLocal(true);
      fetchKanbansOptimized().finally(() => {
        setIsLoadingKanbansLocal(false);
      });
    }
  }, [kanbansLocal.length, isOnline, fetchKanbansOptimized]);

  // Reduced refresh frequency for better performance
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (!lastSyncTime || lastSyncTime < fifteenMinutesAgo) {
        refreshKanbansOptimized();
      }
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [isOnline, lastSyncTime, refreshKanbansOptimized]);

  useEffect(() => {
    if (isOnline && lastOnlineTime) {
      refreshKanbansOptimized();
      toast({
        title: "Connessione ripristinata",
        description: "I dati sono stati aggiornati automaticamente",
      });
    }
  }, [isOnline, lastOnlineTime, refreshKanbansOptimized]);

  // Optimized menu items generation
  const menuItems = useMemo(() => {
    const items = getMenuItems(
      pathname,
      enabledModules.map((m) => m.name),
      basePath
    );

    return items.map((item: MenuItem) => {
      if (item.label === "Kanban") {
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
                href: `${basePath}/kanban?name=${kanban.identifier}`,
                alert: false,
              }))),
          {
            label: "Crea Kanban",
            icon: "faPlus" as const,
            action: () => openCreateModal(),
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
    basePath,
    kanbansLocal,
    isLoadingKanbansLocal,
    isOnline,
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
    setCollapsedMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  }, []);

  const handleSaveKanban = useCallback(
    async (kanbanData: Kanban) => {
      try {
        await saveKanban(kanbanData, domain || "");
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
    },
    [refreshKanbansOptimized, toast, domain]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      apiCache.clear();
    };
  }, []);

  // Optimized display values
  const displayTitle = useMemo(() => {
    if (siteData) {
      return siteData.organization.name
        ? `${siteData.organization.name} - ${siteData.name}`
        : siteData.name;
    }
    return organizationName || "Organization";
  }, [siteData, organizationName]);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{displayTitle}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item: MenuItem) => (
                <React.Fragment key={item.label}>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild={!item.items}
                      isActive={item.href ? isActive(item.href) : false}
                      className={
                        item.href && isActive(item.href)
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : ""
                      }
                      onClick={
                        item.items
                          ? () => toggleMenu(item.label)
                          : item.action
                          ? item.action
                          : undefined
                      }
                    >
                      {item.items ? (
                        <>
                          <FontAwesomeIcon
                            icon={iconMap[item.icon]}
                            className="w-4 h-4"
                          />
                          <span>{item.label}</span>
                        </>
                      ) : item.action ? (
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon
                            icon={iconMap[item.icon]}
                            className="w-4 h-4"
                          />
                          <span>{item.label}</span>
                        </div>
                      ) : (
                        <Link href={item.href!}>
                          <div className="flex items-center gap-2">
                            <FontAwesomeIcon
                              icon={iconMap[item.icon]}
                              className="w-4 h-4"
                            />
                            <span>{item.label}</span>
                          </div>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {item.items && !collapsedMenus[item.label] && (
                    <div className="pl-4">
                      {item.items.map((subItem: MenuItem) => (
                        <SidebarMenuItem key={subItem.label}>
                          {subItem.customComponent ? (
                            <KanbanManagementModal
                              onSave={handleSaveKanban}
                              trigger={
                                <div className="w-full flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-accent rounded-sm">
                                  <FontAwesomeIcon
                                    icon={iconMap[subItem.icon]}
                                    className="w-4 h-4"
                                  />
                                  <span>{subItem.label}</span>
                                </div>
                              }
                            />
                          ) : (
                            <SidebarMenuButton
                              asChild={!!subItem.href}
                              isActive={
                                subItem.href ? isActive(subItem.href) : false
                              }
                              className={
                                subItem.href && isActive(subItem.href)
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                  : ""
                              }
                              onClick={subItem.action}
                            >
                              {subItem.action ? (
                                <div className="flex items-center gap-2">
                                  <FontAwesomeIcon
                                    icon={iconMap[subItem.icon]}
                                    className="w-4 h-4"
                                  />
                                  <span>{subItem.label}</span>
                                </div>
                              ) : (
                                <Link href={subItem.href!}>
                                  <div className="flex items-center gap-2">
                                    <FontAwesomeIcon
                                      icon={iconMap[subItem.icon]}
                                      className="w-4 h-4"
                                    />
                                    <span>{subItem.label}</span>
                                  </div>
                                </Link>
                              )}
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
          <div className="flex items-start">
            <ThemeSwitcher />
          </div>
          <div className="px-2 py-1">
            <NetworkStatus size="sm" />
          </div>
          {userContext && <UserSection user={userContext} />}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
