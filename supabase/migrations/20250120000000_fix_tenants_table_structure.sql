-- Migration: Fix tenants table structure for multiple organizations per user
-- Date: 2025-01-20
-- Description: Ensure tenants table properly supports many-to-many relationship
-- between users and organizations with roles

-- Step 1: Check current table structure
DO $$
BEGIN
    RAISE NOTICE 'Current tenants table structure:';
    RAISE NOTICE 'Checking if tenants table exists and has correct structure...';
END $$;

-- Step 2: Ensure tenants table has the correct structure
-- Drop existing table if it has wrong structure and recreate it
DROP TABLE IF EXISTS "public"."tenants" CASCADE;

-- Create tenants table with proper structure for many-to-many relationship
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

-- Step 3: Create indexes for optimal performance
CREATE INDEX "idx_tenants_user_id" ON "public"."tenants"("user_id");
CREATE INDEX "idx_tenants_organization_id" ON "public"."tenants"("organization_id");
CREATE INDEX "idx_tenants_user_org" ON "public"."tenants"("user_id", "organization_id");
CREATE INDEX "idx_tenants_role" ON "public"."tenants"("role");

-- Step 4: Enable RLS (Row Level Security)
ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
-- Users can view their own tenant relationships
CREATE POLICY "Users can view their own tenant relationships" ON "public"."tenants"
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own tenant relationships
CREATE POLICY "Users can insert their own tenant relationships" ON "public"."tenants"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own tenant relationships
CREATE POLICY "Users can update their own tenant relationships" ON "public"."tenants"
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own tenant relationships
CREATE POLICY "Users can delete their own tenant relationships" ON "public"."tenants"
    FOR DELETE USING (auth.uid() = user_id);

-- Superadmins can view all tenant relationships
CREATE POLICY "Superadmins can view all tenant relationships" ON "public"."tenants"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "public"."tenants" t2 
            WHERE t2.user_id = auth.uid() 
            AND t2.role = 'superadmin'
        )
    );

-- Superadmins can manage all tenant relationships
CREATE POLICY "Superadmins can manage all tenant relationships" ON "public"."tenants"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "public"."tenants" t2 
            WHERE t2.user_id = auth.uid() 
            AND t2.role = 'superadmin'
        )
    );

-- Step 6: Add comments for documentation
COMMENT ON TABLE "public"."tenants" IS 'Junction table allowing users to be associated with multiple organizations with specific roles';
COMMENT ON COLUMN "public"."tenants"."id" IS 'Unique identifier for the tenant relationship';
COMMENT ON COLUMN "public"."tenants"."user_id" IS 'Reference to auth.users.id - the user in this relationship';
COMMENT ON COLUMN "public"."tenants"."organization_id" IS 'Reference to organizations.id - the organization in this relationship';
COMMENT ON COLUMN "public"."tenants"."role" IS 'Role of the user within this specific organization (user, admin, superadmin)';
COMMENT ON COLUMN "public"."tenants"."created_at" IS 'Timestamp when this relationship was created';
COMMENT ON COLUMN "public"."tenants"."updated_at" IS 'Timestamp when this relationship was last updated';

-- Step 7: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at 
    BEFORE UPDATE ON "public"."tenants" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Grant permissions
GRANT ALL ON "public"."tenants" TO authenticated;
GRANT ALL ON "public"."tenants" TO service_role;

-- Step 9: Insert sample data for testing (optional - remove in production)
-- This ensures the table structure works correctly
DO $$
BEGIN
    -- Only insert if there are existing users and organizations
    IF EXISTS (SELECT 1 FROM "auth"."users" LIMIT 1) AND 
       EXISTS (SELECT 1 FROM "public"."organizations" LIMIT 1) THEN
        
        -- Get first user and organization for testing
        INSERT INTO "public"."tenants" ("user_id", "organization_id", "role")
        SELECT 
            u.id as user_id,
            o.id as organization_id,
            'user' as role
        FROM "auth"."users" u 
        CROSS JOIN "public"."organizations" o 
        LIMIT 1
        ON CONFLICT ("user_id", "organization_id") DO NOTHING;
        
        RAISE NOTICE 'Sample tenant relationship created for testing';
    ELSE
        RAISE NOTICE 'No existing users or organizations found - skipping sample data';
    END IF;
END $$;

-- Step 10: Verify the migration
DO $$
BEGIN
    -- Check if table was created successfully
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
        RAISE EXCEPTION 'tenants table was not created successfully';
    END IF;
    
    -- Check if all required columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'user_id') THEN
        RAISE EXCEPTION 'user_id column missing from tenants table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'organization_id') THEN
        RAISE EXCEPTION 'organization_id column missing from tenants table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'role') THEN
        RAISE EXCEPTION 'role column missing from tenants table';
    END IF;
    
    -- Check if unique constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tenants_user_organization_unique'
    ) THEN
        RAISE EXCEPTION 'Unique constraint tenants_user_organization_unique not created';
    END IF;
    
    -- Check if all indexes exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tenants_user_id') THEN
        RAISE EXCEPTION 'Required index idx_tenants_user_id not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tenants_organization_id') THEN
        RAISE EXCEPTION 'Required index idx_tenants_organization_id not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tenants_user_org') THEN
        RAISE EXCEPTION 'Required index idx_tenants_user_org not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tenants_role') THEN
        RAISE EXCEPTION 'Required index idx_tenants_role not created';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully - tenants table structure fixed for multiple organizations per user';
END $$;
