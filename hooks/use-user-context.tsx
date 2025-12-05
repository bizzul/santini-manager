"use client";

import { useQuery } from "@tanstack/react-query";
import { UserContext } from "@/lib/auth-utils";

// Fetch function for user context
async function fetchUserContext(): Promise<UserContext | null> {
  const response = await fetch("/api/auth/me");
  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }
    throw new Error("Failed to fetch user context");
  }
  return response.json();
}

/**
 * Hook to get user context with React Query caching
 * OPTIMIZED: Uses React Query for caching - data is cached for 5 minutes
 * Prevents duplicate API calls across components
 */
export function useUserContext() {
  const { data: userContext, isLoading: loading, error } = useQuery({
    queryKey: ["user-context"],
    queryFn: fetchUserContext,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    retry: 1, // Only retry once for auth
  });

  return { 
    userContext: userContext ?? null, 
    loading, 
    error: error?.message ?? null 
  };
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
