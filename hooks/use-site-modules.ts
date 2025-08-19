import { useEffect, useRef, useState } from "react";
import { ModuleConfig } from "@/lib/module-config";

interface ModuleWithStatus extends ModuleConfig {
    isEnabled: boolean;
}

// Cache for modules data
const modulesCache = new Map<
    string,
    { data: ModuleWithStatus[]; timestamp: number; ttl: number }
>();
const MODULES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useSiteModules(domain: string) {
    const [modules, setModules] = useState<ModuleWithStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!domain) {
            setLoading(false);
            return;
        }

        // Cancel previous request if it exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        const fetchModules = async () => {
            try {
                setLoading(true);
                setError(null);

                // Check cache first
                const cached = modulesCache.get(domain);
                if (cached && Date.now() - cached.timestamp < cached.ttl) {
                    setModules(cached.data);
                    setLoading(false);
                    return;
                }

                const response = await fetch(`/api/sites/${domain}/modules`, {
                    signal: abortControllerRef.current?.signal,
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch modules");
                }

                const data = await response.json();

                // Cache the result
                modulesCache.set(domain, {
                    data: data.modules,
                    timestamp: Date.now(),
                    ttl: MODULES_CACHE_TTL,
                });

                setModules(data.modules);
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") {
                    // Request was cancelled, don't set error
                    return;
                }
                console.error("Error fetching modules:", err);
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to fetch modules",
                );
            } finally {
                setLoading(false);
            }
        };

        fetchModules();

        // Cleanup function
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [domain]);

    const getEnabledModules = () => {
        return modules.filter((module) => module.isEnabled);
    };

    const isModuleEnabled = (moduleName: string) => {
        const foundModule = modules.find((m) => m.name === moduleName);
        return foundModule?.isEnabled ?? false;
    };

    return {
        modules,
        enabledModules: getEnabledModules(),
        isModuleEnabled,
        loading,
        error,
    };
}
