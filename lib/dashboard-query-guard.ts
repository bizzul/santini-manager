import { logger } from "@/lib/logger";

const log = logger.scope("ServerData");

/**
 * Fatal Postgres/PostgREST error codes: when a dashboard query fails with one
 * of these codes the returned payload would be a false "all zero" state, so
 * we rethrow to let the Next.js error boundary render a real fallback.
 *
 * - 42703: undefined_column (e.g. drift between code and DB schema)
 * - 42P01: undefined_table
 * - 42501: insufficient_privilege (RLS misconfig)
 * - PGRST codes: PostgREST-level failures (e.g. PGRST116, PGRST200)
 */
export const FATAL_DASHBOARD_ERROR_CODES = new Set<string>([
    "42703",
    "42P01",
    "42501",
]);

export function isFatalDashboardError(
    code: string | null | undefined,
): boolean {
    if (!code) return false;
    if (FATAL_DASHBOARD_ERROR_CODES.has(code)) return true;
    return code.startsWith("PGRST");
}

/**
 * Assert that a Supabase query result does not carry a fatal error. Logs
 * every error and throws on fatal ones so dashboards never silently render
 * zero KPIs for an underlying schema/RLS problem.
 */
export function assertDashboardQuery(
    result: {
        error?:
            | { code?: string | null; message?: string | null }
            | null;
    },
    label: string,
    context: Record<string, unknown> = {},
): void {
    const error = result?.error;
    if (!error) return;
    log.error(`[Dashboard] ${label} query failed`, { ...context, error });
    if (isFatalDashboardError(error.code ?? null)) {
        throw new Error(
            `[Dashboard] ${label} query failed (${error.code ?? "unknown"}): ${
                error.message ?? "unknown"
            }`,
        );
    }
}
