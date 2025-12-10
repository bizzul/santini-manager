import { z } from "zod";

/**
 * Environment Variables Schema
 *
 * This file validates all environment variables at build/runtime.
 * If a required variable is missing, the app will fail fast with a clear error.
 */

// Schema for server-side environment variables
const serverEnvSchema = z.object({
    // Supabase
    STORAGE_SUPABASE_URL: z.string().url(
        "STORAGE_SUPABASE_URL must be a valid URL",
    ),
    STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(
        1,
        "STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY is required",
    ),
    STORAGE_SUPABASE_SERVICE_ROLE_KEY: z.string().min(
        1,
        "STORAGE_SUPABASE_SERVICE_ROLE_KEY is required",
    ),

    // Vercel (optional - only needed for domain management)
    PROJECT_ID_VERCEL: z.string().optional(),
    TEAM_ID_VERCEL: z.string().optional(),
    AUTH_BEARER_TOKEN: z.string().optional(),
    VERCEL_URL: z.string().optional(),

    // App Configuration
    NODE_ENV: z.enum(["development", "production", "test"]).default(
        "development",
    ),
    COOKIE_NAME: z.string().default("reactive-app:session"),
    REDIRECT_TO_CUSTOM_DOMAIN_IF_EXISTS: z.string().optional(),
});

// Schema for client-side environment variables (NEXT_PUBLIC_*)
const clientEnvSchema = z.object({
    NEXT_PUBLIC_ROOT_DOMAIN: z.string().default("localhost"),
    NEXT_PUBLIC_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
});

// Type definitions
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

// Parsed and validated environment variables
let serverEnvCache: ServerEnv | null = null;
let clientEnvCache: ClientEnv | null = null;

/**
 * Get validated server environment variables
 * Throws an error if validation fails
 */
export function getServerEnv(): ServerEnv {
    if (serverEnvCache) return serverEnvCache;

    const result = serverEnvSchema.safeParse(process.env);

    if (!result.success) {
        const errors = result.error.issues
            .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
            .join("\n");

        throw new Error(
            `❌ Invalid server environment variables:\n${errors}\n\nCheck your .env file or Vercel environment settings.`,
        );
    }

    serverEnvCache = result.data;
    return result.data;
}

/**
 * Get validated client environment variables
 * These are safe to expose to the browser
 */
export function getClientEnv(): ClientEnv {
    if (clientEnvCache) return clientEnvCache;

    const result = clientEnvSchema.safeParse({
        NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
        NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });

    if (!result.success) {
        const errors = result.error.issues
            .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
            .join("\n");

        // Note: Using console.warn here since logger might not be available during env initialization
        console.warn(`⚠️ Invalid client environment variables:\n${errors}`);
        // Don't throw for client env - use defaults
        return {
            NEXT_PUBLIC_ROOT_DOMAIN: "localhost",
        };
    }

    clientEnvCache = result.data;
    return result.data;
}

// Convenience exports for common values
export const env = {
    /** Check if running in development mode */
    isDev: process.env.NODE_ENV === "development",

    /** Check if running in production mode */
    isProd: process.env.NODE_ENV === "production",

    /** Check if running in test mode */
    isTest: process.env.NODE_ENV === "test",

    /** Get the root domain (e.g., "localhost" or "yourapp.com") */
    get rootDomain(): string {
        return getClientEnv().NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost";
    },

    /** Get the full app URL */
    get appUrl(): string {
        const clientEnv = getClientEnv();
        if (clientEnv.NEXT_PUBLIC_URL) return clientEnv.NEXT_PUBLIC_URL;
        if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
        return "http://localhost:3000";
    },

    /** Get the cookie name for sessions */
    get cookieName(): string {
        return process.env.COOKIE_NAME ?? "reactive-app:session";
    },

    /** Supabase configuration */
    supabase: {
        get url(): string {
            return getServerEnv().STORAGE_SUPABASE_URL;
        },
        get anonKey(): string {
            return getServerEnv().STORAGE_NEXT_PUBLIC_SUPABASE_ANON_KEY;
        },
        get serviceRoleKey(): string {
            return getServerEnv().STORAGE_SUPABASE_SERVICE_ROLE_KEY;
        },
    },

    /** Vercel configuration (for domain management) */
    vercel: {
        get projectId(): string | undefined {
            return process.env.PROJECT_ID_VERCEL;
        },
        get teamId(): string | undefined {
            return process.env.TEAM_ID_VERCEL;
        },
        get authToken(): string | undefined {
            return process.env.AUTH_BEARER_TOKEN;
        },
    },
};

// Export type for use in other files
export type Env = typeof env;
