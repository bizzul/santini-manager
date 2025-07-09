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
import { saveKanban } from "@/app/(user)/kanban/actions/save-kanban.action";
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

const operatorItems: menuItem[] = [
  {
    label: "Dashboard",
    icon: faWaveSquare,
    alert: true,
    href: "/",
  },
  {
    label: "Kanban",
    icon: faTable,
    href: "/kanban",
    alert: true,
  },
  {
    label: "Progetti",
    icon: faTable,
    href: "/projects",
    alert: false,
  },
  {
    label: "Calendario",
    icon: faClock,
    href: "/calendar",
    alert: false,
  },
  {
    label: "Clienti",
    icon: faUser,
    href: "/clients",
    alert: false,
  },
  {
    label: "Errori",
    icon: faExclamation,
    href: "/errortracking",
    alert: false,
  },
  {
    label: "Ore",
    icon: faClock,
    href: "/timetracking",
    alert: false,
  },
  {
    label: "Reports",
    icon: faSquarePollVertical,
    href: "/reports",
    alert: false,
    items: [
      {
        label: "Quality Control",
        icon: faCheckSquare,
        href: "/qualityControl",
        alert: false,
      },
      {
        label: "Effettua QC",
        icon: faCheckSquare,
        href: "/qualityControl/edit",
        alert: false,
      },
      {
        label: "Imballaggio",
        icon: faBox,
        href: "/boxing",
        alert: false,
      },
      {
        label: "Effettua imballaggio",
        icon: faBox,
        href: "/boxing/edit",
        alert: false,
      },
    ],
  },

  {
    label: "Inventario",
    icon: faBox,
    href: "/inventory",
    alert: false,
  },
  {
    label: "Prodotti",
    icon: faBox,
    href: "/products",
    alert: false,
  },
  {
    label: "Fornitori",
    icon: faHelmetSafety,
    href: "/suppliers",
    alert: false,
  },
  {
    label: "Categorie",
    icon: faTable,
    href: "/categories",
    alert: false,
  },
  {
    label: "Utenti",
    icon: faUsers,
    href: "/users",
    alert: false,
  },
];

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
  const { toast } = useToast();
  const { isOnline, lastOnlineTime } = useOnlineStatus();

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
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };
      fetchUserData();
    }
  }, [userWithLocal, setUser]);

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
    return operatorItems.map((item) => {
      if (item.label === "Kanban") {
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
                  href: `/kanban?name=${kanban.identifier}`,
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
  }, [kanbans, isLoadingKanbans, isOnline, lastSyncTime, refreshKanbans]);

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
          <SidebarGroupLabel>Baccialegno manager</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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
                      {item.items.map((subItem) => (
                        <SidebarMenuItem key={subItem.label}>
                          {subItem.customComponent ? (
                            <KanbanManagementModal
                              onSave={handleSaveKanban}
                              trigger={
                                <div className="w-full flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-accent rounded">
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
