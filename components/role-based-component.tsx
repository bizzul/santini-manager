"use client";

import { ReactNode } from "react";
import { UserRole } from "@/lib/auth-utils";

interface RoleBasedComponentProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
  userRole?: UserRole;
}

export default function RoleBasedComponent({
  children,
  allowedRoles,
  fallback = null,
  userRole = "user",
}: RoleBasedComponentProps) {
  if (allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

// Convenience components for specific roles
export function SuperAdminOnly({
  children,
  fallback,
  userRole,
}: Omit<RoleBasedComponentProps, "allowedRoles">) {
  return (
    <RoleBasedComponent
      allowedRoles={["superadmin"]}
      fallback={fallback}
      userRole={userRole}
    >
      {children}
    </RoleBasedComponent>
  );
}

export function AdminOnly({
  children,
  fallback,
  userRole,
}: Omit<RoleBasedComponentProps, "allowedRoles">) {
  return (
    <RoleBasedComponent
      allowedRoles={["admin", "superadmin"]}
      fallback={fallback}
      userRole={userRole}
    >
      {children}
    </RoleBasedComponent>
  );
}

export function UserOnly({
  children,
  fallback,
  userRole,
}: Omit<RoleBasedComponentProps, "allowedRoles">) {
  return (
    <RoleBasedComponent
      allowedRoles={["user", "admin", "superadmin"]}
      fallback={fallback}
      userRole={userRole}
    >
      {children}
    </RoleBasedComponent>
  );
}
