import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ModuleConfig } from "@/lib/module-config";

interface ModuleWithStatus extends ModuleConfig {
    isEnabled: boolean;
}

// Fetch function for modules
async function fetchSiteModules(domain: string): Promise<ModuleWithStatus[]> {
    const response = await fetch(`/api/sites/${domain}/modules`);
    if (!response.ok) {
        throw new Error("Failed to fetch modules");
    }
    const data = await response.json();
    return data.modules;
}

/**
 * Hook to get site modules with React Query caching
 * OPTIMIZED: Uses React Query for automatic caching and deduplication
 */
export function useSiteModules(domain: string) {
    const { data: modules = [], isLoading: loading, error } = useQuery({
        queryKey: ["site-modules", domain],
        queryFn: () => fetchSiteModules(domain),
        enabled: !!domain, // Only fetch if domain is provided
        staleTime: 10 * 60 * 1000, // Consider fresh for 10 minutes (modules change rarely)
        gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
        refetchOnWindowFocus: false,
    });

    const enabledModules = useMemo(() => {
        return modules.filter((module) => module.isEnabled);
    }, [modules]);

    const isModuleEnabled = useMemo(() => {
        return (moduleName: string) => {
            const foundModule = modules.find((m) => m.name === moduleName);
            return foundModule?.isEnabled ?? false;
        };
    }, [modules]);

    return {
        modules,
        enabledModules,
        isModuleEnabled,
        loading,
        error: error?.message ?? null,
    };
}
