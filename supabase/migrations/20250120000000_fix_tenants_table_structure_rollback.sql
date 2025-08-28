-- Rollback Migration: Restore previous tenants table structure
-- Date: 2025-01-20
-- Description: Rollback script to restore the previous tenants table structure if needed

-- Step 1: Backup current data (if any exists)
CREATE TABLE IF NOT EXISTS "public"."tenants_backup" AS 
SELECT * FROM "public"."tenants";

-- Step 2: Drop the current tenants table
DROP TABLE IF EXISTS "public"."tenants" CASCADE;

-- Step 3: Recreate the previous tenants table structure
-- Note: This is a basic structure - you may need to adjust based on your original schema
CREATE TABLE "public"."tenants" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "organization_id" uuid NOT NULL,
    "role" text NOT NULL DEFAULT 'user',
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "tenants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE
);

-- Step 4: Create basic indexes
CREATE INDEX "idx_tenants_user_id" ON "public"."tenants"("user_id");
CREATE INDEX "idx_tenants_organization_id" ON "public"."tenants"("organization_id");

-- Step 5: Enable RLS
ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;

-- Step 6: Create basic RLS policies
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

-- Step 8: Restore data from backup (if any existed)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "public"."tenants_backup" LIMIT 1) THEN
        INSERT INTO "public"."tenants" ("id", "user_id", "organization_id", "role", "created_at")
        SELECT "id", "user_id", "organization_id", "role", "created_at"
        FROM "public"."tenants_backup";
        
        RAISE NOTICE 'Data restored from backup';
    ELSE
        RAISE NOTICE 'No backup data to restore';
    END IF;
END $$;

-- Step 9: Clean up backup table
DROP TABLE IF EXISTS "public"."tenants_backup";

-- Step 10: Verify the rollback
DO $$
BEGIN
    -- Check if table was restored successfully
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
        RAISE EXCEPTION 'tenants table was not restored successfully';
    END IF;
    
    -- Check if basic columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'user_id') THEN
        RAISE EXCEPTION 'user_id column missing from tenants table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'organization_id') THEN
        RAISE EXCEPTION 'organization_id column missing from tenants table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'role') THEN
        RAISE EXCEPTION 'role column missing from tenants table';
    END IF;
    
    RAISE NOTICE 'Rollback completed successfully - previous tenants table structure restored';
END $$;
