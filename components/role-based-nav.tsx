"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Edit3,
  Globe,
  Layout,
  LayoutDashboard,
  Megaphone,
  Menu,
  Newspaper,
  Settings,
  FileCode,
  Github,
  Users,
  Building,
  Shield,
  UserCheck,
  Database,
  Kanban,
  Package,
  Clock,
  AlertTriangle,
  FileText,
  ShoppingCart,
} from "lucide-react";
import {
  useParams,
  usePathname,
  useSelectedLayoutSegments,
} from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { UserRole } from "@/lib/auth-utils";

interface RoleBasedNavProps {
  children: ReactNode;
  userRole?: UserRole;
}

const externalLinks = [
  {
    name: "Read the guide",
    href: "https://vercel.com/guides/nextjs-multi-tenant-application",
    icon: <FileCode width={18} />,
  },
  {
    name: "View demo site",
    href: "https://demo.vercel.pub",
    icon: <Layout width={18} />,
  },
];

// Navigation items for different roles
const getNavigationItems = (
  role: UserRole,
  segments: string[],
  id?: string
) => {
  const baseItems = [
    {
      name: "Dashboard",
      href: "/app/dashboard",
      isActive: segments[0] === "dashboard" || segments.length === 0,
      icon: <LayoutDashboard width={18} />,
      roles: ["user", "admin", "superadmin"] as UserRole[],
    },
  ];

  // Superadmin specific items
  const superadminItems = [
    {
      name: "Organizations",
      href: "/app/administration",
      isActive: segments[0] === "administration",
      icon: <Building width={18} />,
      roles: ["superadmin"] as UserRole[],
    },
    {
      name: "Create Organization",
      href: "/app/administration/create-organization",
      isActive: segments.includes("create-organization"),
      icon: <Shield width={18} />,
      roles: ["superadmin"] as UserRole[],
    },
    {
      name: "Create User",
      href: "/app/administration/create-user",
      isActive: segments.includes("create-user"),
      icon: <UserCheck width={18} />,
      roles: ["superadmin"] as UserRole[],
    },
  ];

  // Admin specific items
  const adminItems = [
    {
      name: "Users",
      href: "/app/users",
      isActive: segments[0] === "users",
      icon: <Users width={18} />,
      roles: ["admin", "superadmin"] as UserRole[],
    },
    {
      name: "Employee Roles",
      href: "/app/employeeRoles",
      isActive: segments[0] === "employeeRoles",
      icon: <Shield width={18} />,
      roles: ["admin", "superadmin"] as UserRole[],
    },
  ];

  // Common items for all authenticated users
  const commonItems = [
    {
      name: "Tasks",
      href: "/app/tasks",
      isActive: segments[0] === "tasks",
      icon: <Kanban width={18} />,
      roles: ["user", "admin", "superadmin"] as UserRole[],
    },
    {
      name: "Inventory",
      href: "/app/inventory",
      isActive: segments[0] === "inventory",
      icon: <Package width={18} />,
      roles: ["user", "admin", "superadmin"] as UserRole[],
    },
    {
      name: "Time Tracking",
      href: "/app/timeTracking",
      isActive: segments[0] === "timeTracking",
      icon: <Clock width={18} />,
      roles: ["user", "admin", "superadmin"] as UserRole[],
    },
    {
      name: "Error Tracking",
      href: "/app/errorTracking",
      isActive: segments[0] === "errorTracking",
      icon: <AlertTriangle width={18} />,
      roles: ["user", "admin", "superadmin"] as UserRole[],
    },
    {
      name: "Reports",
      href: "/app/reports",
      isActive: segments[0] === "reports",
      icon: <FileText width={18} />,
      roles: ["user", "admin", "superadmin"] as UserRole[],
    },
    {
      name: "Products",
      href: "/app/products",
      isActive: segments[0] === "products",
      icon: <ShoppingCart width={18} />,
      roles: ["user", "admin", "superadmin"] as UserRole[],
    },
    {
      name: "Suppliers",
      href: "/app/suppliers",
      isActive: segments[0] === "suppliers",
      icon: <Package width={18} />,
      roles: ["user", "admin", "superadmin"] as UserRole[],
    },
    {
      name: "Clients",
      href: "/app/clients",
      isActive: segments[0] === "clients",
      icon: <Users width={18} />,
      roles: ["user", "admin", "superadmin"] as UserRole[],
    },
  ];

  // Combine all items and filter by role
  const allItems = [
    ...baseItems,
    ...superadminItems,
    ...adminItems,
    ...commonItems,
  ];

  return allItems.filter((item) => item.roles.includes(role));
};

export default function RoleBasedNav({
  children,
  userRole = "user",
}: RoleBasedNavProps) {
  const segments = useSelectedLayoutSegments();
  const { id } = useParams() as { id?: string };

  const [siteId, setSiteId] = useState<string | null>();

  const tabs = useMemo(() => {
    if (segments[0] === "site" && id) {
      return [
        {
          name: "Back to All Sites",
          href: "/sites",
          icon: <ArrowLeft width={18} />,
        },
        {
          name: "Analytics",
          href: `/site/${id}/analytics`,
          isActive: segments.includes("analytics"),
          icon: <BarChart3 width={18} />,
        },
        {
          name: "Settings",
          href: `/site/${id}/settings`,
          isActive: segments.includes("settings"),
          icon: <Settings width={18} />,
        },
      ];
    }

    return getNavigationItems(userRole, segments, id);
  }, [segments, id, siteId, userRole]);

  const [showSidebar, setShowSidebar] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    // hide sidebar on path change
    setShowSidebar(false);
  }, [pathname]);

  return (
    <>
      <button
        className={`fixed z-20 ${
          // left align for Editor, right align for other pages
          segments[0] === "post" && segments.length === 2 && !showSidebar
            ? "left-5 top-5"
            : "right-5 top-7"
        } sm:hidden`}
        onClick={() => setShowSidebar(!showSidebar)}
      >
        <Menu width={20} />
      </button>
      <div
        className={`transform ${
          showSidebar ? "w-full translate-x-0" : "-translate-x-full"
        } fixed z-10 flex h-full flex-col justify-between border-r border-stone-200 bg-stone-100 p-4 transition-all sm:w-60 sm:translate-x-0 dark:border-stone-700 dark:bg-stone-900`}
      >
        <div className="grid gap-2">
          <div className="flex items-center space-x-2 rounded-lg px-2 py-1.5">
            <a
              href="https://vercel.com/templates/next.js/platforms-starter-kit"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700"
            >
              <svg
                width="26"
                viewBox="0 0 76 65"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-black dark:text-white"
              >
                <path
                  d="M37.5274 0L75.0548 65H0L37.5274 0Z"
                  fill="currentColor"
                />
              </svg>
            </a>
            <div className="h-6 rotate-[30deg] border-l border-stone-400 dark:border-stone-500" />
            <Link
              href="/"
              className="rounded-lg p-2 hover:bg-stone-200 dark:hover:bg-stone-700"
            >
              <Image
                src="/logo.png"
                width={24}
                height={24}
                alt="Logo"
                className="dark:scale-110 dark:rounded-full dark:border dark:border-stone-400"
              />
            </Link>
          </div>

          {/* Role Badge */}
          <div className="px-2 py-1">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                userRole === "superadmin"
                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  : userRole === "admin"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              }`}
            >
              {userRole === "superadmin" && (
                <Shield width={12} className="mr-1" />
              )}
              {userRole === "admin" && (
                <UserCheck width={12} className="mr-1" />
              )}
              {userRole === "user" && <Users width={12} className="mr-1" />}
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </span>
          </div>

          <div className="grid gap-1">
            {tabs.map(({ name, href, isActive, icon }) => (
              <Link
                key={name}
                href={href}
                className={`flex items-center space-x-3 ${
                  isActive ? "bg-stone-200 text-black dark:bg-stone-700" : ""
                } rounded-lg px-2 py-1.5 transition-all duration-150 ease-in-out hover:bg-stone-200 active:bg-stone-300 dark:text-white dark:hover:bg-stone-700 dark:active:bg-stone-800`}
              >
                {icon}
                <span className="text-sm font-medium">{name}</span>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="grid gap-1">
            {externalLinks.map(({ name, href, icon }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-all duration-150 ease-in-out hover:bg-stone-200 active:bg-stone-300 dark:text-white dark:hover:bg-stone-700 dark:active:bg-stone-800"
              >
                <div className="flex items-center space-x-3">
                  {icon}
                  <span className="text-sm font-medium">{name}</span>
                </div>
                <p>↗</p>
              </a>
            ))}
          </div>
          <div className="my-2 border-t border-stone-200 dark:border-stone-700" />
          {children}
        </div>
      </div>
    </>
  );
}
