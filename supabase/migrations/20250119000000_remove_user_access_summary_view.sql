-- Migration: Remove user_access_summary view and optimize for join-based queries
-- Date: 2025-01-19
-- Description: Remove the user_access_summary view since we're now using direct joins
-- and optimize the database structure for better performance

-- Step 1: Drop the user_access_summary view since we're no longer using it
DROP VIEW IF EXISTS "public"."user_access_summary";

-- Step 2: Ensure proper indexes exist for the join queries we're now using
-- Index for tenants table to optimize user_id lookups
CREATE INDEX IF NOT EXISTS "idx_tenants_user_id" ON "public"."tenants"("user_id");

-- Index for tenants table to optimize organization_id lookups
CREATE INDEX IF NOT EXISTS "idx_tenants_organization_id" ON "public"."tenants"("organization_id");

-- Composite index for tenants table to optimize user_id + organization_id lookups
CREATE INDEX IF NOT EXISTS "idx_tenants_user_org" ON "public"."tenants"("user_id", "organization_id");

-- Index for user_sites table to optimize user_id lookups
CREATE INDEX IF NOT EXISTS "idx_user_sites_user_id" ON "public"."user_sites"("user_id");

-- Index for user_sites table to optimize site_id lookups
CREATE INDEX IF NOT EXISTS "idx_user_sites_site_id" ON "public"."user_sites"("site_id");

-- Composite index for user_sites table to optimize user_id + site_id lookups
CREATE INDEX IF NOT EXISTS "idx_user_sites_user_site" ON "public"."user_sites"("user_id", "site_id");

-- Step 3: Add comments for documentation
COMMENT ON TABLE "public"."tenants" IS 'Junction table allowing users to be associated with multiple organizations with specific roles';
COMMENT ON COLUMN "public"."tenants"."user_id" IS 'Reference to auth.users.id';
COMMENT ON COLUMN "public"."tenants"."organization_id" IS 'Reference to organizations.id';
COMMENT ON COLUMN "public"."tenants"."role" IS 'Role of the user within this specific organization';

COMMENT ON TABLE "public"."user_sites" IS 'Junction table allowing users to be associated with multiple sites with specific roles';
COMMENT ON COLUMN "public"."user_sites"."user_id" IS 'Reference to auth.users.id';
COMMENT ON COLUMN "public"."user_sites"."site_id" IS 'Reference to sites.id';
COMMENT ON COLUMN "public"."user_sites"."role" IS 'Role of the user within this specific site';

-- Step 4: Ensure RLS policies are properly configured for the new approach
-- Update RLS policy for tenants table to ensure users can only see their own relationships
DROP POLICY IF EXISTS "Users can view their own tenant relationships" ON "public"."tenants";
CREATE POLICY "Users can view their own tenant relationships" ON "public"."tenants"
    FOR SELECT USING (auth.uid() = user_id);

-- Update RLS policy for user_sites table to ensure users can only see their own relationships
DROP POLICY IF EXISTS "Users can view their own site relationships" ON "public"."user_sites";
CREATE POLICY "Users can view their own site relationships" ON "public"."user_sites"
    FOR SELECT USING (auth.uid() = user_id);

-- Step 5: Add performance hints for the database optimizer
-- These comments help the query planner understand the expected data distribution
COMMENT ON INDEX "public"."idx_tenants_user_id" IS 'Optimizes queries filtering tenants by user_id';
COMMENT ON INDEX "public"."idx_tenants_organization_id" IS 'Optimizes queries filtering tenants by organization_id';
COMMENT ON INDEX "public"."idx_tenants_user_org" IS 'Optimizes queries filtering tenants by both user_id and organization_id';
COMMENT ON INDEX "public"."idx_user_sites_user_id" IS 'Optimizes queries filtering user_sites by user_id';
COMMENT ON INDEX "public"."idx_user_sites_site_id" IS 'Optimizes queries filtering user_sites by site_id';
COMMENT ON INDEX "public"."idx_user_sites_user_site" IS 'Optimizes queries filtering user_sites by both user_id and site_id';

-- Step 6: Verify the migration
DO $$
BEGIN
    -- Check if the view was successfully dropped
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_access_summary') THEN
        RAISE EXCEPTION 'user_access_summary view still exists after migration';
    END IF;
    
    -- Check if all required indexes exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tenants_user_id') THEN
        RAISE EXCEPTION 'Required index idx_tenants_user_id not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tenants_organization_id') THEN
        RAISE EXCEPTION 'Required index idx_tenants_organization_id not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tenants_user_org') THEN
        RAISE EXCEPTION 'Required index idx_tenants_user_org not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_sites_user_id') THEN
        RAISE EXCEPTION 'Required index idx_user_sites_user_id not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_sites_site_id') THEN
        RAISE EXCEPTION 'Required index idx_user_sites_site_id not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_sites_user_site') THEN
        RAISE EXCEPTION 'Required index idx_user_sites_user_site not created';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully - user_access_summary view removed and indexes created';
END $$;
