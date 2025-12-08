import { NextRequest, NextResponse } from "next/server";
import { z, ZodError, ZodSchema } from "zod";
import { logger } from "@/lib/logger";

/**
 * Standard API response format
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
}

/**
 * Create a success response
 */
export function successResponse<T>(
    data: T,
    status = 200,
): NextResponse<ApiResponse<T>> {
    return NextResponse.json(
        { success: true, data },
        { status },
    );
}

/**
 * Create an error response
 */
export function errorResponse(
    code: string,
    message: string,
    status = 400,
    details?: unknown,
): NextResponse<ApiResponse> {
    return NextResponse.json(
        {
            success: false,
            error: { code, message, details },
        },
        { status },
    );
}

/**
 * Common error codes
 */
export const ErrorCodes = {
    VALIDATION_ERROR: "VALIDATION_ERROR",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    NOT_FOUND: "NOT_FOUND",
    INTERNAL_ERROR: "INTERNAL_ERROR",
    BAD_REQUEST: "BAD_REQUEST",
    SITE_NOT_FOUND: "SITE_NOT_FOUND",
} as const;

/**
 * Parse and validate request body with Zod schema
 */
export async function parseBody<T>(
    req: NextRequest,
    schema: ZodSchema<T>,
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
    try {
        const body = await req.json();
        const result = schema.safeParse(body);

        if (!result.success) {
            const formattedErrors = formatZodError(result.error);
            return {
                data: null,
                error: errorResponse(
                    ErrorCodes.VALIDATION_ERROR,
                    "Dati non validi",
                    400,
                    formattedErrors,
                ),
            };
        }

        return { data: result.data, error: null };
    } catch (e) {
        logger.error("Failed to parse request body:", e);
        return {
            data: null,
            error: errorResponse(
                ErrorCodes.BAD_REQUEST,
                "Formato richiesta non valido",
                400,
            ),
        };
    }
}

/**
 * Parse and validate query parameters
 */
export function parseQuery<T>(
    req: NextRequest,
    schema: ZodSchema<T>,
): { data: T; error: null } | { data: null; error: NextResponse } {
    const url = new URL(req.url);
    const params: Record<string, string> = {};

    url.searchParams.forEach((value, key) => {
        params[key] = value;
    });

    const result = schema.safeParse(params);

    if (!result.success) {
        const formattedErrors = formatZodError(result.error);
        return {
            data: null,
            error: errorResponse(
                ErrorCodes.VALIDATION_ERROR,
                "Parametri query non validi",
                400,
                formattedErrors,
            ),
        };
    }

    return { data: result.data, error: null };
}

/**
 * Format Zod errors for API response
 */
export function formatZodError(error: ZodError): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};

    error.errors.forEach((err) => {
        const path = err.path.join(".");
        if (!formatted[path]) {
            formatted[path] = [];
        }
        formatted[path].push(err.message);
    });

    return formatted;
}

/**
 * Higher-order function to wrap API handlers with validation
 */
export function withValidation<TBody, TQuery = undefined>(
    bodySchema?: ZodSchema<TBody>,
    querySchema?: ZodSchema<TQuery>,
) {
    return function (
        handler: (
            req: NextRequest,
            context: {
                body: TBody;
                query: TQuery;
                params: Record<string, string>;
            },
        ) => Promise<NextResponse>,
    ) {
        return async (
            req: NextRequest,
            { params }: { params?: Promise<Record<string, string>> } = {},
        ): Promise<NextResponse> => {
            try {
                let body: TBody = undefined as TBody;
                let query: TQuery = undefined as TQuery;
                const resolvedParams = params ? await params : {};

                // Validate body if schema provided
                if (
                    bodySchema &&
                    (req.method === "POST" || req.method === "PUT" ||
                        req.method === "PATCH")
                ) {
                    const bodyResult = await parseBody(req, bodySchema);
                    if (bodyResult.error) return bodyResult.error;
                    body = bodyResult.data;
                }

                // Validate query if schema provided
                if (querySchema) {
                    const queryResult = parseQuery(req, querySchema);
                    if (queryResult.error) return queryResult.error;
                    query = queryResult.data;
                }

                return await handler(req, {
                    body,
                    query,
                    params: resolvedParams,
                });
            } catch (error) {
                logger.error("API handler error:", error);
                return errorResponse(
                    ErrorCodes.INTERNAL_ERROR,
                    "Errore interno del server",
                    500,
                );
            }
        };
    };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
    id: z.object({
        id: z.string().or(z.number()),
    }),

    pagination: z.object({
        page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
        limit: z.string().optional().transform((
            v,
        ) => (v ? parseInt(v, 10) : 20)),
    }),

    siteId: z.object({
        siteId: z.string().uuid(),
    }),
};
