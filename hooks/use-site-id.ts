import { useEffect, useState } from "react";

export function useSiteId(domain?: string) {
    const [siteId, setSiteId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!domain) {
            setSiteId(null);
            return;
        }

        const fetchSiteId = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `/api/domain?domain=${encodeURIComponent(domain)}`,
                );

                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch site data: ${response.status}`,
                    );
                }

                const siteData = await response.json();
                setSiteId(siteData?.id || null);
            } catch (err) {
                console.error("Error fetching site data:", err);
                setError(err instanceof Error ? err.message : "Unknown error");
                setSiteId(null);
            } finally {
                setLoading(false);
            }
        };

        fetchSiteId();
    }, [domain]);

    return { siteId, loading, error };
}
