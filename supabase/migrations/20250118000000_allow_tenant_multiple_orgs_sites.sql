-- Migration to allow tenants to be in multiple organizations and multiple sites
-- This removes the current 1:1 relationship constraints and creates many-to-many relationships

-- Step 1: Remove the unique constraint that prevents users from being in multiple organizations
ALTER TABLE "public"."tenants" DROP CONSTRAINT IF EXISTS "tenants_organization_id_user_id_key";

-- Step 2: Create a new junction table for user-site relationships
CREATE TABLE IF NOT EXISTS "public"."user_sites" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "site_id" uuid NOT NULL,
    "role" text,
    "created_at" timestamp without time zone DEFAULT now(),
    PRIMARY KEY ("id")
);

-- Step 3: Add foreign key constraints for the new user_sites table
ALTER TABLE "public"."user_sites" 
    ADD CONSTRAINT "user_sites_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."user_sites" 
    ADD CONSTRAINT "user_sites_site_id_fkey" 
    FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_user_sites_user_id" ON "public"."user_sites"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_sites_site_id" ON "public"."user_sites"("site_id");
CREATE INDEX IF NOT EXISTS "idx_user_sites_user_site" ON "public"."user_sites"("user_id", "site_id");

-- Step 5: Enable RLS on the new table
ALTER TABLE "public"."user_sites" ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for user_sites table
CREATE POLICY "Users can view their own site relationships" ON "public"."user_sites"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own site relationships" ON "public"."user_sites"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own site relationships" ON "public"."user_sites"
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own site relationships" ON "public"."user_sites"
    FOR DELETE USING (auth.uid() = user_id);

-- Step 7: Add a unique constraint to prevent duplicate user-site relationships
ALTER TABLE "public"."user_sites" 
    ADD CONSTRAINT "user_sites_user_id_site_id_key" 
    UNIQUE ("user_id", "site_id");

-- Step 8: Update existing RLS policies to work with the new structure
-- Drop existing policies that reference the old tenant structure
DROP POLICY IF EXISTS "Users can view clients from their organization" ON "public"."Client";
DROP POLICY IF EXISTS "Users can insert clients in their organization" ON "public"."Client";
DROP POLICY IF EXISTS "Users can update clients in their organization" ON "public"."Client";
DROP POLICY IF EXISTS "Users can delete clients in their organization" ON "public"."Client";

-- Create new RLS policies that work with the new many-to-many structure
CREATE POLICY "Users can view clients from their sites" ON "public"."Client"
    FOR SELECT USING (
        site_id IN (
            SELECT site_id 
            FROM "public"."user_sites" 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert clients in their sites" ON "public"."Client"
    FOR INSERT WITH CHECK (
        site_id IN (
            SELECT site_id 
            FROM "public"."user_sites" 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update clients in their sites" ON "public"."Client"
    FOR UPDATE USING (
        site_id IN (
            SELECT site_id 
            FROM "public"."user_sites" 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete clients in their sites" ON "public"."Client"
    FOR DELETE USING (
        site_id IN (
            SELECT site_id 
            FROM "public"."user_sites" 
            WHERE user_id = auth.uid()
        )
    );

-- Step 9: Add comments for documentation
COMMENT ON TABLE "public"."user_sites" IS 'Junction table allowing users to be associated with multiple sites';
COMMENT ON COLUMN "public"."user_sites"."role" IS 'Role of the user within this specific site';
COMMENT ON COLUMN "public"."tenants"."role" IS 'Role of the user within this specific organization';

-- Step 10: Create a view for easier querying of user access
CREATE OR REPLACE VIEW "public"."user_access_summary" AS
SELECT 
    u.id as user_id,
    u.email,
    array_agg(DISTINCT o.id) as organization_ids,
    array_agg(DISTINCT o.name) as organization_names,
    array_agg(DISTINCT s.id) as site_ids,
    array_agg(DISTINCT s.name) as site_names
FROM "public"."User" u
LEFT JOIN "public"."tenants" t ON u.auth_id = t.user_id
LEFT JOIN "public"."organizations" o ON t.organization_id = o.id
LEFT JOIN "public"."user_sites" us ON u.auth_id = us.user_id
LEFT JOIN "public"."sites" s ON us.site_id = s.id
GROUP BY u.id, u.email;

-- Grant access to the view
GRANT SELECT ON "public"."user_access_summary" TO authenticated;
