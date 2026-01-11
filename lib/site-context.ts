import { NextRequest } from "next/server";
import { getSiteData } from "@/lib/fetchers";
import { cache } from "react";
import { logger } from "@/lib/logger";

const log = logger.scope("SiteContext");

export interface SiteContext {
    siteId: string | null;
    domain: string | null;
    siteData?: any;
}

/**
 * Extract site context from a Next.js API request
 * Centralizes the logic for getting site_id from headers or domain
 */
export async function getSiteContext(req: NextRequest): Promise<SiteContext> {
    // First check for explicit site_id header (preferred for API calls)
    const siteIdFromHeader = req.headers.get("x-site-id");
    // Check for x-site-domain header (used by export CSV buttons)
    const siteDomainFromHeader = req.headers.get("x-site-domain");
    const domain = req.headers.get("host");

    if (siteIdFromHeader) {
        return {
            siteId: siteIdFromHeader,
            domain,
        };
    }

    // Check for x-site-domain header and resolve to site ID
    if (siteDomainFromHeader) {
        try {
            const siteResult = await getSiteData(siteDomainFromHeader);
            if (siteResult?.data) {
                return {
                    siteId: siteResult.data.id,
                    domain: siteDomainFromHeader,
                    siteData: siteResult.data,
                };
            }
        } catch (error) {
            log.error("Error fetching site data from x-site-domain:", error);
        }
    }

    // Fall back to host header domain lookup
    if (domain) {
        try {
            const siteResult = await getSiteData(domain);
            if (siteResult?.data) {
                return {
                    siteId: siteResult.data.id,
                    domain,
                    siteData: siteResult.data,
                };
            }
        } catch (error) {
            log.error("Error fetching site data:", error);
        }
    }

    return {
        siteId: null,
        domain,
    };
}

/**
 * Get site context from domain string (for server actions)
 * Cached per request using React cache()
 */
export const getSiteContextFromDomain = cache(
    async (domain: string): Promise<SiteContext> => {
        if (!domain) {
            return { siteId: null, domain: null };
        }

        try {
            const siteResult = await getSiteData(domain);
            if (siteResult?.data) {
                return {
                    siteId: siteResult.data.id,
                    domain,
                    siteData: siteResult.data,
                };
            }
        } catch (error) {
            log.error("Error fetching site data:", error);
        }

        return { siteId: null, domain };
    },
);

/**
 * Type guard to check if site context has a valid site ID
 */
export function hasSiteId(
    context: SiteContext,
): context is SiteContext & { siteId: string } {
    return context.siteId !== null && context.siteId !== undefined;
}

/**
 * Require site ID - throws if not available
 * Use this when siteId is mandatory (multi-tenant endpoints)
 */
export function requireSiteId(context: SiteContext): string {
    if (!hasSiteId(context)) {
        throw new Error("Site ID is required but not available");
    }
    return context.siteId;
}
