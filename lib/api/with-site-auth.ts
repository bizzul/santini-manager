import { NextRequest, NextResponse } from "next/server";
import { getSiteContext, hasSiteId, SiteContext } from "@/lib/site-context";
import { getUserContext, UserContext } from "@/lib/auth-utils";
import { ApiResponse, ErrorCodes, errorResponse } from "./validation";
import { logger } from "@/lib/logger";

export interface AuthenticatedContext {
    siteContext: SiteContext;
    userContext: UserContext;
    siteId: string;
}

/**
 * Higher-order function to wrap API handlers with site authentication
 * Ensures both user authentication and site access are validated
 */
export function withSiteAuth(
    handler: (
        req: NextRequest,
        context: AuthenticatedContext,
        params: Record<string, string>,
    ) => Promise<NextResponse>,
) {
    return async (
        req: NextRequest,
        { params }: { params?: Promise<Record<string, string>> } = {},
    ): Promise<NextResponse> => {
        try {
            const resolvedParams = params ? await params : {};

            // Get user context
            const userContext = await getUserContext();
            if (!userContext) {
                return errorResponse(
                    ErrorCodes.UNAUTHORIZED,
                    "Autenticazione richiesta",
                    401,
                );
            }

            // Get site context
            const siteContext = await getSiteContext(req);

            if (!hasSiteId(siteContext)) {
                return errorResponse(
                    ErrorCodes.SITE_NOT_FOUND,
                    "Sito non trovato",
                    404,
                );
            }

            logger.api(req.method, req.url, { siteId: siteContext.siteId });

            return await handler(req, {
                siteContext,
                userContext,
                siteId: siteContext.siteId,
            }, resolvedParams);
        } catch (error) {
            logger.error("withSiteAuth error:", error);
            return errorResponse(
                ErrorCodes.INTERNAL_ERROR,
                "Errore interno del server",
                500,
            );
        }
    };
}

/**
 * Lighter version that only requires site context (no user auth required)
 * Useful for public endpoints that still need site filtering
 */
export function withSiteContext(
    handler: (
        req: NextRequest,
        siteContext: SiteContext,
        params: Record<string, string>,
    ) => Promise<NextResponse>,
) {
    return async (
        req: NextRequest,
        { params }: { params?: Promise<Record<string, string>> } = {},
    ): Promise<NextResponse> => {
        try {
            const resolvedParams = params ? await params : {};
            const siteContext = await getSiteContext(req);

            logger.api(req.method, req.url, { siteId: siteContext.siteId });

            return await handler(req, siteContext, resolvedParams);
        } catch (error) {
            logger.error("withSiteContext error:", error);
            return errorResponse(
                ErrorCodes.INTERNAL_ERROR,
                "Errore interno del server",
                500,
            );
        }
    };
}

/**
 * Require specific site ID - useful for route params validation
 */
export function requireSiteId(siteContext: SiteContext): string | null {
    return hasSiteId(siteContext) ? siteContext.siteId : null;
}
