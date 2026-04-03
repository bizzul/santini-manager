import type { DemoAccessToken, DemoWorkspace } from "@/types/supabase";

export type DemoListSort =
    | "recent"
    | "last-login"
    | "most-logins"
    | "expiring";

export interface DemoListItemForFiltering {
    workspace: DemoWorkspace;
    activeToken: DemoAccessToken | null;
    activeUrl: string | null;
    site: {
        id: string;
        name: string;
        subdomain: string;
        logo?: string | null;
    } | null;
}

export interface DemoListFilters {
    query?: string;
    status?: string;
    template?: string;
    sector?: string;
    sort?: DemoListSort;
}

export interface DemoLandingAvailabilityInput {
    workspaceStatus: DemoWorkspace["status"];
    workspaceExpiresAt?: string | null;
    tokenExpiresAt?: string | null;
    tokenRevokedAt?: string | null;
    tokenUsePolicy: "single_use" | "multi_use";
    tokenUsesCount: number;
    tokenMaxUses?: number | null;
}

export type DemoLandingAvailability =
    | "active"
    | "revoked"
    | "expired"
    | "used";

function isExpired(date?: string | null) {
    return !!date && new Date(date).getTime() < Date.now();
}

export function getDemoLandingAvailability(
    input: DemoLandingAvailabilityInput,
): DemoLandingAvailability {
    if (input.workspaceStatus === "revoked" || input.tokenRevokedAt) {
        return "revoked";
    }

    if (
        input.workspaceStatus === "expired" ||
        isExpired(input.workspaceExpiresAt) ||
        isExpired(input.tokenExpiresAt)
    ) {
        return "expired";
    }

    if (
        input.tokenUsePolicy === "single_use" &&
        input.tokenUsesCount > 0
    ) {
        return "used";
    }

    if (
        input.tokenMaxUses &&
        input.tokenUsesCount >= input.tokenMaxUses
    ) {
        return "used";
    }

    return "active";
}

export function filterDemoWorkspaceList<T extends DemoListItemForFiltering>(
    items: T[],
    filters: DemoListFilters,
) {
    const query = filters.query?.trim().toLowerCase();
    let result = [...items];

    if (query) {
        result = result.filter((item) => {
            const haystack = [
                item.workspace.display_name,
                item.workspace.customer_name,
                item.workspace.customer_company,
                item.workspace.template_key,
                item.workspace.sector_key,
                item.site?.subdomain,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return haystack.includes(query);
        });
    }

    if (filters.status && filters.status !== "all") {
        result = result.filter((item) => item.workspace.status === filters.status);
    }

    if (filters.template && filters.template !== "all") {
        result = result.filter((item) =>
            item.workspace.template_key === filters.template
        );
    }

    if (filters.sector && filters.sector !== "all") {
        result = result.filter((item) =>
            item.workspace.sector_key === filters.sector
        );
    }

    switch (filters.sort) {
        case "last-login":
            result.sort((a, b) =>
                new Date(b.workspace.last_login_at || 0).getTime() -
                new Date(a.workspace.last_login_at || 0).getTime()
            );
            break;
        case "most-logins":
            result.sort((a, b) => b.workspace.login_count - a.workspace.login_count);
            break;
        case "expiring":
            result.sort((a, b) =>
                new Date(a.workspace.expires_at || Number.MAX_SAFE_INTEGER).getTime() -
                new Date(b.workspace.expires_at || Number.MAX_SAFE_INTEGER).getTime()
            );
            break;
        default:
            result.sort((a, b) =>
                new Date(b.workspace.created_at).getTime() -
                new Date(a.workspace.created_at).getTime()
            );
            break;
    }

    return result;
}
