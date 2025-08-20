-- Add organization and site context to Client table
-- This ensures proper data isolation between different organizations and sites

-- Check if columns already exist to avoid conflicts
DO $$ 
BEGIN
    -- Add organization_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Client' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE "public"."Client" ADD COLUMN "organization_id" uuid REFERENCES "public"."organizations"("id");
    END IF;

    -- Add site_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Client' AND column_name = 'site_id'
    ) THEN
        ALTER TABLE "public"."Client" ADD COLUMN "site_id" uuid REFERENCES "public"."sites"("id");
    END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS "idx_client_organization_id" ON "public"."Client"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_client_site_id" ON "public"."Client"("site_id");

-- Enable RLS only if not already enabled
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'Client' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE "public"."Client" ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view clients from their organization" ON "public"."Client";
DROP POLICY IF EXISTS "Users can insert clients in their organization" ON "public"."Client";
DROP POLICY IF EXISTS "Users can update clients in their organization" ON "public"."Client";
DROP POLICY IF EXISTS "Users can delete clients in their organization" ON "public"."Client";

-- Create new RLS policies for data isolation
CREATE POLICY "Users can view clients from their organization" ON "public"."Client"
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM "public"."tenants" 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert clients in their organization" ON "public"."Client"
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM "public"."tenants" 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update clients in their organization" ON "public"."Client"
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM "public"."tenants" 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete clients in their organization" ON "public"."Client"
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id 
            FROM "public"."tenants" 
            WHERE user_id = auth.uid()
        )
    );
