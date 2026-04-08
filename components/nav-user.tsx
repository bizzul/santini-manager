"use client";

import {
  BadgeCheck,
  Bell,
  BookOpen,
  ChevronsUpDown,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { memo } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserContext } from "@/lib/auth-utils";
import Link from "next/link";
import { useLogout } from "@/hooks/use-logout";
import { useSiteId } from "@/hooks/use-site-id";
import { ManagerGuideMascot, useManagerGuide } from "@/components/manager-guide";

export const NavUser = memo(function NavUser({
  user,
  domain,
}: {
  user: UserContext;
  domain?: string;
}) {
  const { isMobile } = useSidebar();
  const { logout } = useLogout();
  const { siteId } = useSiteId(domain);
  const { openGuide, showOnLogin, setShowOnLogin } = useManagerGuide();

  // Extract user information from the context
  const userData = user.user;
  const userProfile = user.user?.user_metadata;

  // Get display name (first name + last name) or fallback to email
  const displayName =
    userProfile?.full_name ||
    (userProfile?.name && userProfile?.last_name
      ? `${userProfile.name} ${userProfile.last_name}`
      : userData?.email || "User");

  // Get role for display
  const roleDisplay = user.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="rounded-2xl border border-[hsl(var(--sidebar-border)/0.8)] bg-[hsl(var(--background)/0.92)] px-3 shadow-[0_10px_24px_hsl(var(--page-shadow)/0.12)] data-[state=open]:bg-[hsl(var(--background))] data-[state=open]:text-[hsl(var(--sidebar-foreground))] dark:rounded-xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none dark:data-[state=open]:bg-white/15 dark:data-[state=open]:text-white"
            >
              <Avatar className="h-8 w-8 rounded-lg border border-[hsl(var(--sidebar-border))] dark:border-white/20">
                <AvatarImage
                  src={userProfile?.picture || undefined}
                  alt={displayName}
                />
                <AvatarFallback className="rounded-lg bg-[hsl(var(--page-glow))] text-[hsl(var(--sidebar-foreground))] dark:bg-white/10 dark:text-white">
                  {displayName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-[hsl(var(--sidebar-foreground))] dark:text-white">
                  {displayName}
                </span>
                <span className="truncate text-xs text-[hsl(var(--sidebar-foreground)/0.62)] dark:text-white/60">
                  {userData?.email}
                </span>
                {roleDisplay && (
                  <span className="truncate text-xs text-[hsl(var(--sidebar-foreground)/0.62)] dark:text-white/60">
                    {roleDisplay}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-[hsl(var(--sidebar-foreground)/0.6)] dark:text-white/70" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={userProfile?.picture || undefined}
                    alt={displayName}
                  />
                  <AvatarFallback className="rounded-lg">
                    {displayName
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {userData?.email}
                  </span>
                  {roleDisplay && (
                    <span className="truncate text-xs text-muted-foreground">
                      {roleDisplay}
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notifiche
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openGuide()}
                className="cursor-pointer"
              >
                <ManagerGuideMascot size="sm" />
                <BookOpen />
                Guida manager
              </DropdownMenuItem>
              <DropdownMenuCheckboxItem
                checked={showOnLogin}
                onCheckedChange={(checked) => setShowOnLogin(checked === true)}
              >
                Mostra guida all'accesso
              </DropdownMenuCheckboxItem>
              {(user.role === "admin" || user.role === "superadmin") && (
                <DropdownMenuItem asChild>
                  <Link
                    href={
                      siteId
                        ? `/administration/sites/${siteId}/edit`
                        : "/administration"
                    }
                    className="w-full"
                  >
                    <ShieldCheck />
                    Administration
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer">
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
});
