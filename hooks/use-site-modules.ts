import { useEffect, useState } from "react";
import { ModuleConfig } from "@/lib/module-config";

interface ModuleWithStatus extends ModuleConfig {
    isEnabled: boolean;
}

export function useSiteModules(domain: string) {
    const [modules, setModules] = useState<ModuleWithStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!domain) {
            setLoading(false);
            return;
        }

        const fetchModules = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`/api/sites/${domain}/modules`);
                if (!response.ok) {
                    throw new Error("Failed to fetch modules");
                }

                const data = await response.json();
                setModules(data.modules);
            } catch (err) {
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
