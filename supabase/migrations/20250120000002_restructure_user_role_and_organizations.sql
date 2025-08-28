-- Migration: Restructure user roles and organization relationships
-- Date: 2025-01-20
-- Description: Move role from tenants table to User table and create clean user_organizations table
-- This eliminates RLS recursion issues and provides cleaner architecture

-- Step 1: Backup existing data
CREATE TABLE IF NOT EXISTS "public"."tenants_backup" AS 
SELECT * FROM "public"."tenants";

-- Step 2: Add role column to User table
ALTER TABLE "public"."User" 
ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'user';

-- Step 3: Create the new user_organizations table
CREATE TABLE IF NOT EXISTS "public"."user_organizations" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "organization_id" uuid NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "user_organizations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_organizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "user_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "user_organizations_user_org_unique" UNIQUE ("user_id", "organization_id")
);

-- Step 4: Create indexes for performance
CREATE INDEX "idx_user_organizations_user_id" ON "public"."user_organizations"("user_id");
CREATE INDEX "idx_user_organizations_organization_id" ON "public"."user_organizations"("organization_id");
CREATE INDEX "idx_user_organizations_user_org" ON "public"."user_organizations"("user_id", "organization_id");

-- Step 5: Migrate existing data from tenants table to User table and user_organizations table
DO $$
DECLARE
    tenant_record RECORD;
    user_role text;
BEGIN
    -- For each user, determine their highest role across all organizations
    FOR tenant_record IN 
        SELECT DISTINCT user_id, 
               CASE 
                   WHEN COUNT(*) FILTER (WHERE role = 'superadmin') > 0 THEN 'superadmin'
                   WHEN COUNT(*) FILTER (WHERE role = 'admin') > 0 THEN 'admin'
                   ELSE 'user'
               END as highest_role
        FROM "public"."tenants" 
        GROUP BY user_id
    LOOP
        -- Update the User table with the highest role
        UPDATE "public"."User" 
        SET role = tenant_record.highest_role 
        WHERE auth_id = tenant_record.user_id;
        
        RAISE NOTICE 'Updated user % with role %', tenant_record.user_id, tenant_record.highest_role;
    END LOOP;
    
    -- Copy organization relationships to the new table
    INSERT INTO "public"."user_organizations" ("user_id", "organization_id", "created_at")
    SELECT DISTINCT user_id, organization_id, created_at
    FROM "public"."tenants"
    ON CONFLICT ("user_id", "organization_id") DO NOTHING;
    
    RAISE NOTICE 'Migrated organization relationships to user_organizations table';
END $$;

-- Step 6: Enable RLS on the new table
ALTER TABLE "public"."user_organizations" ENABLE ROW LEVEL SECURITY;

-- Step 7: Create simple RLS policies for user_organizations
-- Users can view their own organization relationships
CREATE POLICY "Users can view their own organization relationships" ON "public"."user_organizations"
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own organization relationships
CREATE POLICY "Users can insert their own organization relationships" ON "public"."user_organizations"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own organization relationships
CREATE POLICY "Users can update their own organization relationships" ON "public"."user_organizations"
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own organization relationships
CREATE POLICY "Users can delete their own organization relationships" ON "public"."user_organizations"
    FOR DELETE USING (auth.uid() = user_id);

-- Superadmins can manage all organization relationships
CREATE POLICY "Superadmins can manage all organization relationships" ON "public"."user_organizations"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "public"."User" 
            WHERE auth_id = auth.uid() 
            AND role = 'superadmin'
        )
    );

-- Step 8: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_organizations_updated_at 
    BEFORE UPDATE ON "public"."user_organizations" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_user_organizations_updated_at();

-- Step 9: Grant permissions
GRANT ALL ON "public"."user_organizations" TO authenticated;
GRANT ALL ON "public"."user_organizations" TO service_role;

-- Step 10: Add comments for documentation
COMMENT ON TABLE "public"."user_organizations" IS 'Junction table for many-to-many relationship between users and organizations';
COMMENT ON COLUMN "public"."user_organizations"."id" IS 'Unique identifier for the user-organization relationship';
COMMENT ON COLUMN "public"."user_organizations"."user_id" IS 'Reference to auth.users.id';
COMMENT ON COLUMN "public"."user_organizations"."organization_id" IS 'Reference to organizations.id';
COMMENT ON COLUMN "public"."user_organizations"."created_at" IS 'When this relationship was created';
COMMENT ON COLUMN "public"."user_organizations"."updated_at" IS 'When this relationship was last updated';

COMMENT ON COLUMN "public"."User"."role" IS 'Global role of the user (superadmin, admin, user)';

-- Step 11: Create helper functions for the new structure
-- Function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid uuid)
RETURNS TABLE(organization_id uuid, organization_name text, created_at timestamptz) AS $$
BEGIN
    RETURN QUERY
    SELECT uo.organization_id, o.name, uo.created_at
    FROM "public"."user_organizations" uo
    JOIN "public"."organizations" o ON uo.organization_id = o.id
    WHERE uo.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is in organization
CREATE OR REPLACE FUNCTION is_user_in_organization(user_uuid uuid, org_uuid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM "public"."user_organizations" 
        WHERE user_id = user_uuid AND organization_id = org_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get organization users
CREATE OR REPLACE FUNCTION get_organization_users(org_uuid uuid)
RETURNS TABLE(user_id uuid, email text, given_name text, family_name text, role text, joined_at timestamptz) AS $$
BEGIN
    RETURN QUERY
    SELECT uo.user_id, u.email, up.given_name, up.family_name, up.role, uo.created_at
    FROM "public"."user_organizations" uo
    JOIN "auth"."users" u ON uo.user_id = u.id
    JOIN "public"."User" up ON u.id = up.auth_id
    WHERE uo.organization_id = org_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION get_user_organizations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_in_organization(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_users(uuid) TO authenticated;

-- Step 13: Verify the migration
DO $$
BEGIN
    -- Check if role column was added to User table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'role'
    ) THEN
        RAISE EXCEPTION 'Role column not added to User table';
    END IF;
    
    -- Check if user_organizations table was created
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_organizations'
    ) THEN
        RAISE EXCEPTION 'user_organizations table not created';
    END IF;
    
    -- Check if all indexes were created
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_organizations_user_id') THEN
        RAISE EXCEPTION 'Required index idx_user_organizations_user_id not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_organizations_organization_id') THEN
        RAISE EXCEPTION 'Required index idx_user_organizations_organization_id not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_organizations_user_org') THEN
        RAISE EXCEPTION 'Required index idx_user_organizations_user_org not created';
    END IF;
    
    -- Check if all policies were created
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_organizations' 
        AND policyname = 'Users can view their own organization relationships'
    ) THEN
        RAISE EXCEPTION 'Policy "Users can view their own organization relationships" not created';
    END IF;
    
    -- Check if helper functions were created
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_organizations') THEN
        RAISE EXCEPTION 'Function get_user_organizations not created';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully - User roles restructured and user_organizations table created';
END $$;
