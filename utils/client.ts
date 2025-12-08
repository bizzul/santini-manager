// Re-export from the main supabase client for consistency
// This ensures all client-side code uses the same singleton Supabase client
export { createClient } from "./supabase/client";
