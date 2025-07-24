"use client";

import { useEffect, useState } from "react";
import { UserContext } from "@/lib/auth-utils";

export function useUserContext() {
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserContext() {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setUserContext(data);
        } else {
          setError("Failed to fetch user context");
        }
      } catch (err) {
        setError("Error fetching user context");
      } finally {
        setLoading(false);
      }
    }

    fetchUserContext();
  }, []);

  return { userContext, loading, error };
}

// Convenience hook for checking if user has a specific role
export function useHasRole(requiredRole: "user" | "admin" | "superadmin") {
  const { userContext, loading } = useUserContext();

  if (loading || !userContext) {
    return false;
  }

  const roleHierarchy: Record<string, number> = {
    user: 1,
    admin: 2,
    superadmin: 3,
  };

  return roleHierarchy[userContext.role] >= roleHierarchy[requiredRole];
}

// Convenience hooks for specific roles
export function useIsSuperAdmin() {
  return useHasRole("superadmin");
}

export function useIsAdmin() {
  return useHasRole("admin");
}

export function useIsUser() {
  return useHasRole("user");
}
