"use client";

import { useEffect, useState } from "react";

type SiteDataResponse = {
    id: string;
};

const SITE_ID_TTL_MS = 15 * 60 * 1000;
const siteIdCache = new Map<string, { id: string; expiresAt: number }>();
const inFlightRequests = new Map<string, Promise<SiteDataResponse>>();

async function fetchSiteData(domain: string): Promise<SiteDataResponse> {
    const response = await fetch(`/api/sites/${encodeURIComponent(domain)}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch site data: ${response.status}`);
    }

    return response.json();
}

async function getSiteDataCached(domain: string): Promise<SiteDataResponse> {
    const now = Date.now();
    const cached = siteIdCache.get(domain);
    if (cached && cached.expiresAt > now) {
        return { id: cached.id };
    }

    const existingRequest = inFlightRequests.get(domain);
    if (existingRequest) {
        return existingRequest;
    }

    const request = fetchSiteData(domain)
        .then((data) => {
            siteIdCache.set(domain, {
                id: data.id,
                expiresAt: Date.now() + SITE_ID_TTL_MS,
            });
            return data;
        })
        .finally(() => {
            inFlightRequests.delete(domain);
        });

    inFlightRequests.set(domain, request);
    return request;
}

export function useSiteId(domain?: string) {
    const [siteId, setSiteId] = useState<string | null>(null);
    const [loading, setLoading] = useState(Boolean(domain));
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        if (!domain) {
            setSiteId(null);
            setLoading(false);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        void getSiteDataCached(domain)
            .then((data) => {
                if (cancelled) return;
                setSiteId(data?.id || null);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to fetch site data",
                );
                setSiteId(null);
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [domain]);

    return {
        siteId,
        loading,
        error,
    };
}
