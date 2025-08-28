-- Rollback Migration: Restore previous user role and organization structure
-- Date: 2025-01-20
-- Description: Rollback script to restore the previous tenants table structure

-- Step 1: Backup current data
CREATE TABLE IF NOT EXISTS "public"."user_organizations_backup" AS 
SELECT * FROM "public"."user_organizations";

-- Step 2: Restore the tenants table structure
DROP TABLE IF EXISTS "public"."tenants" CASCADE;

CREATE TABLE "public"."tenants" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "organization_id" uuid NOT NULL,
    "role" text NOT NULL DEFAULT 'user',
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "tenants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "tenants_user_organization_unique" UNIQUE ("user_id", "organization_id")
);

-- Step 3: Create indexes for tenants table
CREATE INDEX "idx_tenants_user_id" ON "public"."tenants"("user_id");
CREATE INDEX "idx_tenants_organization_id" ON "public"."tenants"("organization_id");
CREATE INDEX "idx_tenants_user_org" ON "public"."tenants"("user_id", "organization_id");
CREATE INDEX "idx_tenants_role" ON "public"."tenants"("role");

-- Step 4: Restore data from backup
DO $$
BEGIN
    -- Restore tenant records with roles from User table
    INSERT INTO "public"."tenants" ("user_id", "organization_id", "role", "created_at")
    SELECT 
        uo.user_id, 
        uo.organization_id, 
        COALESCE(u.role, 'user') as role,
        uo.created_at
    FROM "public"."user_organizations_backup" uo
    JOIN "public"."User" u ON uo.user_id = u.auth_id;
    
    RAISE NOTICE 'Restored tenant records from backup';
END $$;

-- Step 5: Enable RLS on tenants table
ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;

-- Step 6: Create basic RLS policies for tenants
CREATE POLICY "Users can view their own tenant relationships" ON "public"."tenants"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tenant relationships" ON "public"."tenants"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tenant relationships" ON "public"."tenants"
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tenant relationships" ON "public"."tenants"
    FOR DELETE USING (auth.uid() = user_id);

-- Step 7: Grant permissions
GRANT ALL ON "public"."tenants" TO authenticated;
GRANT ALL ON "public"."tenants" TO service_role;

-- Step 8: Drop the new table and functions
DROP TABLE IF EXISTS "public"."user_organizations" CASCADE;
DROP FUNCTION IF EXISTS get_user_organizations(uuid);
DROP FUNCTION IF EXISTS is_user_in_organization(uuid, uuid);
DROP FUNCTION IF EXISTS get_organization_users(uuid);

-- Step 9: Remove role column from User table (optional - keep if you want)
-- ALTER TABLE "public"."User" DROP COLUMN IF EXISTS "role";

-- Step 10: Clean up backup tables
DROP TABLE IF EXISTS "public"."user_organizations_backup";
DROP TABLE IF EXISTS "public"."tenants_backup";

-- Step 11: Verify the rollback
DO $$
BEGIN
    -- Check if tenants table was restored
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
        RAISE EXCEPTION 'tenants table was not restored';
    END IF;
    
    -- Check if user_organizations table was removed
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_organizations') THEN
        RAISE EXCEPTION 'user_organizations table still exists';
    END IF;
    
    -- Check if basic columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'user_id') THEN
        RAISE EXCEPTION 'user_id column missing from tenants table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'role') THEN
        RAISE EXCEPTION 'role column missing from tenants table';
    END IF;
    
    RAISE NOTICE 'Rollback completed successfully - Previous structure restored';
END $$;
