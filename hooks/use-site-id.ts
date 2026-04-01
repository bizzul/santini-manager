import { useQuery } from "@tanstack/react-query";
type SiteDataResponse = {
    id: string;
};

async function fetchSiteData(domain: string): Promise<SiteDataResponse> {
    const response = await fetch(`/api/sites/${encodeURIComponent(domain)}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch site data: ${response.status}`);
    }

    return response.json();
}

export function useSiteId(domain?: string) {
    const { data, isLoading, error } = useQuery({
        queryKey: ["site-data", domain],
        queryFn: () => fetchSiteData(domain!),
        enabled: !!domain,
        staleTime: 15 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    return {
        siteId: data?.id || null,
        loading: isLoading,
        error: error instanceof Error ? error.message : null,
    };
}
