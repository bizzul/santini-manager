import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Generates a unique project code by checking for existing codes
 * If the code already exists, it appends .1, .2, etc.
 * Example: if "123" exists, returns "123.1". If "123.1" exists too, returns "123.2"
 *
 * @param supabase - Supabase client instance
 * @param baseCode - The original code to check
 * @param siteId - Optional site ID to scope the uniqueness check
 * @returns The unique code (original if available, or with suffix if not)
 */
export async function generateUniqueCode(
    supabase: SupabaseClient,
    baseCode: string,
    siteId?: string | null,
): Promise<string> {
    if (!baseCode || baseCode.trim() === "") {
        return baseCode;
    }

    const trimmedCode = baseCode.trim();

    // Get all existing codes that match the base pattern
    // This includes the exact code and any with .N suffix
    let query = supabase
        .from("Task")
        .select("unique_code")
        .or(`unique_code.eq.${trimmedCode},unique_code.like.${trimmedCode}.%`);

    if (siteId) {
        query = query.eq("site_id", siteId);
    }

    const { data: existingCodes, error } = await query;

    if (error) {
        console.error("Error checking for existing unique codes:", error);
        // Return the original code and let the database constraint handle it
        return trimmedCode;
    }

    // If no existing codes, the original is available
    if (!existingCodes || existingCodes.length === 0) {
        return trimmedCode;
    }

    // Create a set of existing codes for quick lookup
    const codeSet = new Set(
        existingCodes.map((item) => item.unique_code?.toLowerCase()),
    );

    // Check if the base code itself exists
    if (!codeSet.has(trimmedCode.toLowerCase())) {
        return trimmedCode;
    }

    // Find the next available suffix number
    let suffix = 1;
    while (codeSet.has(`${trimmedCode.toLowerCase()}.${suffix}`)) {
        suffix++;
    }

    return `${trimmedCode}.${suffix}`;
}

/**
 * Extracts the base code from a code that might have a suffix
 * Example: "123.2" returns "123", "123" returns "123"
 *
 * @param code - The code to extract the base from
 * @returns The base code without suffix
 */
export function getBaseCode(code: string): string {
    if (!code) return code;

    // Match pattern: baseCode.number (where number is one or more digits at the end)
    const match = code.match(/^(.+)\.(\d+)$/);
    if (match) {
        return match[1];
    }
    return code;
}
