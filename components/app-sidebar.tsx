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

type menuItem = {
  label: string;
  icon: IconDefinition;
  href: string;
  alert: boolean;
  items?: menuItem[];
  customComponent?: React.ReactNode;
};

// Function to get menu items based on current context
const getMenuItems = (pathname: string): menuItem[] => {
  // Check if we're on a site domain (sites/[domain] route)
  const isOnSiteDomain = pathname.includes("/sites/");

  // Extract domain from pathname if on site domain
  const domain = isOnSiteDomain
    ? pathname.split("/sites/")[1]?.split("/")[0]
    : null;

  // Base path for site-specific routes
  const basePath = isOnSiteDomain ? `/sites/${domain}` : "";

  const siteSpecificItems: menuItem[] = [
    {
      label: "Dashboard",
      icon: faWaveSquare,
      alert: true,
      href: `${basePath}/dashboard`,
    },
    {
      label: "Kanban",
      icon: faTable,
      href: `${basePath}/kanban`,
      alert: true,
    },
    {
      label: "Progetti",
      icon: faTable,
      href: `${basePath}/projects`,
      alert: false,
    },
    // {
    //   label: "Calendario",
    //   icon: faClock,
    //   href: `${basePath}/calendar`,
    //   alert: false,
    // },
    {
      label: "Clienti",
      icon: faUser,
      href: `${basePath}/clients`,
      alert: false,
    },
    // {
    //   label: "Errori",
    //   icon: faExclamation,
    //   href: `${basePath}/errortracking`,
    //   alert: false,
    // },
    // {
    //   label: "Ore",
    //   icon: faClock,
    //   href: `${basePath}/timetracking`,
    //   alert: false,
    // },
    // {
    //   label: "Reports",
    //   icon: faSquarePollVertical,
    //   href: `${basePath}/reports`,
    //   alert: false,
    //   items: [
    //     {
    //       label: "Quality Control",
    //       icon: faCheckSquare,
    //       href: `${basePath}/qualityControl`,
    //       alert: false,
    //     },
    //     {
    //       label: "Effettua QC",
    //       icon: faCheckSquare,
    //       href: `${basePath}/qualityControl/edit`,
    //       alert: false,
    //     },
    //     {
    //       label: "Imballaggio",
    //       icon: faBox,
    //       href: `${basePath}/boxing`,
    //       alert: false,
    //     },
    //     {
    //       label: "Effettua imballaggio",
    //       icon: faBox,
    //       href: `${basePath}/boxing/edit`,
    //       alert: false,
    //     },
    //   ],
    // },
    {
      label: "Inventario",
      icon: faBox,
      href: `${basePath}/inventory`,
      alert: false,
    },
    {
      label: "Prodotti",
      icon: faBox,
      href: `${basePath}/products`,
      alert: false,
    },
    {
      label: "Fornitori",
      icon: faHelmetSafety,
      href: `${basePath}/suppliers`,
      alert: false,
    },
    {
      label: "Categorie",
      icon: faTable,
      href: `${basePath}/categories`,
      alert: false,
    },
  ];

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

  // Function to fetch organization name
  const fetchOrganizationName = useCallback(async (organizationId: string) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setOrganizationName(data.name);
      } else {
        console.error("Failed to fetch organization name");
        setOrganizationName("Organization");
      }
    } catch (error) {
      console.error("Error fetching organization name:", error);
      setOrganizationName("Organization");
    }
  }, []);

  // Function to fetch site name
  const fetchSiteName = useCallback(
    async (domain: string) => {
      try {
        const response = await fetch(`/api/sites/${domain}`);
        if (response.ok) {
          const data = await response.json();
          setSiteName(data.name);
          // Optionally, fetch org name if not already set
          if (data.organization_id && !organizationName) {
            fetchOrganizationName(data.organization_id);
          }
        } else {
          setSiteName("");
        }
      } catch (error) {
        setSiteName("");
      }
    },
    [organizationName, fetchOrganizationName]
  );

  // Handle online/offline status changes
  useEffect(() => {
    if (isOnline && lastOnlineTime) {
      // Just came back online, refresh kanbans
      refreshKanbans();
      toast({
        title: "Connessione ripristinata",
        description: "I dati sono stati aggiornati automaticamente",
      });
    }
  }, [isOnline, lastOnlineTime]);

  useEffect(() => {
    if (!userWithLocal) {
      const fetchUserData = async () => {
        try {
          const response = await fetch("/api/auth/me");
          const data = await response.json();
          if (data.user) {
            setUser(data.user);
            // Fetch organization name if we have organizationId
            if (data.organizationId) {
              fetchOrganizationName(data.organizationId);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };
      fetchUserData();
    } else {
      // If user is already loaded, fetch organization name
      const fetchOrgName = async () => {
        try {
          const response = await fetch("/api/auth/me");
          const data = await response.json();
          if (data.organizationId) {
            fetchOrganizationName(data.organizationId);
          }
        } catch (error) {
          console.error("Error fetching organization data:", error);
        }
      };
      fetchOrgName();
    }
  }, [userWithLocal, setUser, fetchOrganizationName]);

  useEffect(() => {
    if (kanbans.length === 0 && isOnline) {
      setIsLoadingKanbans(true);
      const fetchKanbans = async () => {
        try {
          const response = await fetch("/api/kanban/list", {
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          });
          if (!response.ok) throw new Error("Failed to fetch kanbans");
          const data = await response.json();
          const kanbanData = Array.isArray(data) ? data : [];
          setKanbans(kanbanData);
          setLastSyncTime(new Date());
        } catch (error) {
          console.error("Error fetching kanbans:", error);
          setKanbans([]);
        } finally {
          setIsLoadingKanbans(false);
        }
      };
      fetchKanbans();
    }
  }, [kanbans.length, setKanbans, isOnline]);

  // Add a function to manually refresh kanbans
  const refreshKanbans = useCallback(async () => {
    if (!isOnline) {
      toast({
        title: "Impossibile aggiornare",
        description: "Nessuna connessione internet disponibile",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingKanbans(true);
    try {
      const response = await fetch("/api/kanban/list", {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch kanbans");
      const data = await response.json();
      const kanbanData = Array.isArray(data) ? data : [];
      setKanbans(kanbanData);
      setLastSyncTime(new Date());
      toast({
        title: "Aggiornamento completato",
        description: "Lista kanban aggiornata con successo",
      });
    } catch (error) {
      console.error("Error refreshing kanbans:", error);
      setKanbans([]);
      toast({
        title: "Errore nell'aggiornamento",
        description: "Impossibile aggiornare la lista kanban",
        variant: "destructive",
      });
    } finally {
      setIsLoadingKanbans(false);
    }
  }, [setKanbans, isOnline, toast]);

  // Periodic refresh when online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      // Only refresh if we haven't refreshed in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (!lastSyncTime || lastSyncTime < fiveMinutesAgo) {
        refreshKanbans();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isOnline, lastSyncTime, refreshKanbans]);

  useEffect(() => {
    // If on a site domain, fetch site name
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
    const items = getMenuItems(pathname);
    return items.map((item: menuItem) => {
      if (item.label === "Kanban") {
        // Get the base path for kanban routes
        const isOnSiteDomain = pathname.includes("/sites/");
        const domain = isOnSiteDomain
          ? pathname.split("/sites/")[1]?.split("/")[0]
          : null;
        const basePath = isOnSiteDomain ? `/sites/${domain}` : "";

        return {
          ...item,
          items: [
            ...(isLoadingKanbans
              ? [
                  {
                    label: "Caricamento...",
                    icon: faWrench,
                    href: "#",
                    alert: false,
                  },
                ]
              : kanbans.length === 0
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
              : kanbans.map((kanban) => ({
                  label: kanban.title,
                  icon: faTable,
                  href: `${basePath}/kanban?name=${kanban.identifier}`,
                  alert: false,
                }))),
            {
              label: "Crea Nuovo Kanban",
              icon: faPlus,
              href: "#",
              alert: false,
              customComponent: true,
            },
          ],
        };
      }
      return item;
    });
  }, [
    kanbans,
    isLoadingKanbans,
    isOnline,
    lastSyncTime,
    refreshKanbans,
    pathname,
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
      await refreshKanbans();
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
