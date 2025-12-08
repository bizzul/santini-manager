import { useQuery } from "@tanstack/react-query";
import { DomainResponse, DomainVerificationStatusProps } from "@/lib/types";

interface DomainStatusResponse {
    status: DomainVerificationStatusProps;
    domainJson: DomainResponse & { error: { code: string; message: string } };
}

async function fetchDomainStatus(
    domain: string,
): Promise<DomainStatusResponse> {
    const response = await fetch(`/api/domain/${domain}/verify`);
    if (!response.ok) {
        throw new Error("Failed to verify domain");
    }
    return response.json();
}

/**
 * Hook to check domain verification status
 * Uses React Query for caching and automatic refetching
 */
export function useDomainStatus({ domain }: { domain: string }) {
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ["domain-status", domain],
        queryFn: () => fetchDomainStatus(domain),
        enabled: !!domain,
        // Refetch every 5 seconds to check verification status
        refetchInterval: 5000,
        // Keep previous data while refetching
        placeholderData: (previousData) => previousData,
        // Consider data stale immediately for frequent updates
        staleTime: 0,
    });

    return {
        status: data?.status,
        domainJson: data?.domainJson,
        loading: isLoading || isFetching,
    };
}
