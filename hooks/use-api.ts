import {
    useQuery,
    useQueryClient,
    UseQueryOptions,
} from "@tanstack/react-query";
import { useSiteId } from "./use-site-id";

/**
 * Standard API fetcher with error handling
 */
async function apiFetcher<T>(url: string): Promise<T> {
    const response = await fetch(url);

    if (!response.ok) {
        const error = await response.json().catch(() => ({
            message: "Request failed",
        }));
        throw new Error(error.message || `HTTP error ${response.status}`);
    }

    return response.json();
}

/**
 * API fetcher with site ID header
 */
async function apiFetcherWithSite<T>(
    url: string,
    siteId?: string | null,
): Promise<T> {
    const headers: HeadersInit = {};
    if (siteId) {
        headers["x-site-id"] = siteId;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
        const error = await response.json().catch(() => ({
            message: "Request failed",
        }));
        throw new Error(error.message || `HTTP error ${response.status}`);
    }

    return response.json();
}

interface QueryOptions<T> {
    initialData?: T;
    enabled?: boolean;
}

/**
 * Hook for fetching suppliers
 * Pass initialData from server component to avoid loading state
 */
export function useSuppliers(domain?: string, options?: QueryOptions<any[]>) {
    const { siteId } = useSiteId(domain);

    return useQuery({
        queryKey: ["suppliers", domain, siteId],
        queryFn: () =>
            apiFetcherWithSite<any[]>("/api/inventory/suppliers", siteId),
        enabled: (options?.enabled ?? !!domain) && !!siteId,
        staleTime: 10 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
        initialData: options?.initialData,
    });
}

/**
 * Hook for fetching categories
 * Pass initialData from server component to avoid loading state
 */
export function useCategories(domain?: string, options?: QueryOptions<any[]>) {
    const { siteId } = useSiteId(domain);

    return useQuery({
        queryKey: ["categories", domain, siteId],
        queryFn: () =>
            apiFetcherWithSite<any[]>("/api/inventory/categories", siteId),
        enabled: (options?.enabled ?? !!domain) && !!siteId,
        staleTime: 10 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
        initialData: options?.initialData,
    });
}

/**
 * Hook for fetching clients
 * Pass initialData from server component to avoid loading state
 */
export function useClients(domain?: string, options?: QueryOptions<any[]>) {
    const { siteId } = useSiteId(domain);

    return useQuery({
        queryKey: ["clients", domain, siteId],
        queryFn: () => apiFetcherWithSite<any[]>("/api/clients", siteId),
        enabled: (options?.enabled ?? !!domain) && !!siteId,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        initialData: options?.initialData,
    });
}

/**
 * Hook for fetching a single client by ID
 */
export function useClient(
    clientId: number | null,
    options?: QueryOptions<any>,
) {
    return useQuery({
        queryKey: ["client", clientId],
        queryFn: () => apiFetcher<any>(`/api/clients/${clientId}`),
        enabled: !!clientId,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        initialData: options?.initialData,
    });
}

/**
 * Hook for fetching a single task by ID
 */
export function useTask(taskId: number | null, options?: QueryOptions<any>) {
    return useQuery({
        queryKey: ["task", taskId],
        queryFn: () => apiFetcher<any>(`/api/tasks/${taskId}`),
        enabled: !!taskId,
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        initialData: options?.initialData,
    });
}

/**
 * Hook for fetching sell products
 * Pass initialData from server component to avoid loading state
 */
export function useSellProducts(
    domain?: string,
    options?: QueryOptions<any[]>,
) {
    const { siteId } = useSiteId(domain);

    return useQuery({
        queryKey: ["sell-products", domain, siteId],
        queryFn: () => apiFetcherWithSite<any[]>("/api/sell-products", siteId),
        enabled: (options?.enabled ?? !!domain) && !!siteId,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        initialData: options?.initialData,
    });
}

/**
 * Hook for fetching kanban tasks
 * Pass initialData from server component to avoid loading state
 */
export function useKanbanTasks(domain?: string, options?: QueryOptions<any[]>) {
    const { siteId } = useSiteId(domain);

    return useQuery({
        queryKey: ["kanban-tasks", domain, siteId],
        queryFn: () => apiFetcherWithSite<any[]>("/api/kanban/tasks", siteId),
        enabled: (options?.enabled ?? !!domain) && !!siteId,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        initialData: options?.initialData,
    });
}

/**
 * Generic hook for custom API fetching with site context
 */
export function useApiQuery<T>(
    key: string | string[],
    url: string,
    domain?: string,
    options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">,
) {
    const { siteId } = useSiteId(domain);
    const queryKey = Array.isArray(key) ? [...key, siteId] : [key, siteId];

    return useQuery({
        queryKey,
        queryFn: () => apiFetcherWithSite<T>(url, siteId),
        enabled: !!siteId,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        ...options,
    });
}

/**
 * Prefetch utility for preloading data
 */
export function usePrefetch(domain?: string) {
    const queryClient = useQueryClient();
    const { siteId } = useSiteId(domain);

    return {
        prefetchSuppliers: () => {
            if (!siteId) return Promise.resolve();
            return queryClient.prefetchQuery({
                queryKey: ["suppliers", domain, siteId],
                queryFn: () =>
                    apiFetcherWithSite<any[]>(
                        "/api/inventory/suppliers",
                        siteId,
                    ),
                staleTime: 10 * 60 * 1000,
            });
        },
        prefetchCategories: () => {
            if (!siteId) return Promise.resolve();
            return queryClient.prefetchQuery({
                queryKey: ["categories", domain, siteId],
                queryFn: () =>
                    apiFetcherWithSite<any[]>(
                        "/api/inventory/categories",
                        siteId,
                    ),
                staleTime: 10 * 60 * 1000,
            });
        },
        prefetchClients: () => {
            if (!siteId) return Promise.resolve();
            return queryClient.prefetchQuery({
                queryKey: ["clients", domain, siteId],
                queryFn: () =>
                    apiFetcherWithSite<any[]>("/api/clients", siteId),
                staleTime: 5 * 60 * 1000,
            });
        },
    };
}

/**
 * Invalidation utilities
 */
export function useInvalidateQueries() {
    const queryClient = useQueryClient();

    return {
        invalidateSuppliers: () =>
            queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
        invalidateCategories: () =>
            queryClient.invalidateQueries({ queryKey: ["categories"] }),
        invalidateClients: () =>
            queryClient.invalidateQueries({ queryKey: ["clients"] }),
        invalidateSellProducts: () =>
            queryClient.invalidateQueries({ queryKey: ["sell-products"] }),
        invalidateKanbanTasks: () =>
            queryClient.invalidateQueries({ queryKey: ["kanban-tasks"] }),
        invalidateAll: () => queryClient.invalidateQueries(),
    };
}
