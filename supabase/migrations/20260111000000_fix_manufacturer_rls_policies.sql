-- Fix Manufacturer and Manufacturer_category RLS policies to check both user_sites and user_organizations
-- The original policies only checked user_sites, but users are typically added to user_organizations

-- ========================================
-- Fix Manufacturer_category RLS policies
-- ========================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert manufacturer categories for their sites" ON "public"."Manufacturer_category";

-- Create new INSERT policy that checks both user_sites and user_organizations
CREATE POLICY "Users can insert manufacturer categories for their sites"
    ON "public"."Manufacturer_category"
    FOR INSERT
    WITH CHECK (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view manufacturer categories for their sites" ON "public"."Manufacturer_category";

-- Create new SELECT policy that checks both user_sites and user_organizations
CREATE POLICY "Users can view manufacturer categories for their sites"
    ON "public"."Manufacturer_category"
    FOR SELECT
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update manufacturer categories for their sites" ON "public"."Manufacturer_category";

-- Create new UPDATE policy that checks both user_sites and user_organizations
CREATE POLICY "Users can update manufacturer categories for their sites"
    ON "public"."Manufacturer_category"
    FOR UPDATE
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Users can delete manufacturer categories for their sites" ON "public"."Manufacturer_category";

-- Create new DELETE policy that checks both user_sites and user_organizations
CREATE POLICY "Users can delete manufacturer categories for their sites"
    ON "public"."Manufacturer_category"
    FOR DELETE
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- ========================================
-- Fix Manufacturer RLS policies
-- ========================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert manufacturers for their sites" ON "public"."Manufacturer";

-- Create new INSERT policy that checks both user_sites and user_organizations
CREATE POLICY "Users can insert manufacturers for their sites"
    ON "public"."Manufacturer"
    FOR INSERT
    WITH CHECK (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view manufacturers for their sites" ON "public"."Manufacturer";

-- Create new SELECT policy that checks both user_sites and user_organizations
CREATE POLICY "Users can view manufacturers for their sites"
    ON "public"."Manufacturer"
    FOR SELECT
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update manufacturers for their sites" ON "public"."Manufacturer";

-- Create new UPDATE policy that checks both user_sites and user_organizations
CREATE POLICY "Users can update manufacturers for their sites"
    ON "public"."Manufacturer"
    FOR UPDATE
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Users can delete manufacturers for their sites" ON "public"."Manufacturer";

-- Create new DELETE policy that checks both user_sites and user_organizations
CREATE POLICY "Users can delete manufacturers for their sites"
    ON "public"."Manufacturer"
    FOR DELETE
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- ========================================
-- Fix Supplier_category RLS policies (same issue)
-- ========================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert supplier categories for their sites" ON "public"."Supplier_category";

-- Create new INSERT policy that checks both user_sites and user_organizations
CREATE POLICY "Users can insert supplier categories for their sites"
    ON "public"."Supplier_category"
    FOR INSERT
    WITH CHECK (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view supplier categories for their sites" ON "public"."Supplier_category";

-- Create new SELECT policy that checks both user_sites and user_organizations
CREATE POLICY "Users can view supplier categories for their sites"
    ON "public"."Supplier_category"
    FOR SELECT
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update supplier categories for their sites" ON "public"."Supplier_category";

-- Create new UPDATE policy that checks both user_sites and user_organizations
CREATE POLICY "Users can update supplier categories for their sites"
    ON "public"."Supplier_category"
    FOR UPDATE
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Users can delete supplier categories for their sites" ON "public"."Supplier_category";

-- Create new DELETE policy that checks both user_sites and user_organizations
CREATE POLICY "Users can delete supplier categories for their sites"
    ON "public"."Supplier_category"
    FOR DELETE
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- ========================================
-- Fix Client RLS policies (same issue)
-- ========================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view clients from their sites" ON "public"."Client";

-- Create new SELECT policy that checks both user_sites and user_organizations
CREATE POLICY "Users can view clients from their sites"
    ON "public"."Client"
    FOR SELECT
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert clients in their sites" ON "public"."Client";

-- Create new INSERT policy that checks both user_sites and user_organizations
CREATE POLICY "Users can insert clients in their sites"
    ON "public"."Client"
    FOR INSERT
    WITH CHECK (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update clients in their sites" ON "public"."Client";

-- Create new UPDATE policy that checks both user_sites and user_organizations
CREATE POLICY "Users can update clients in their sites"
    ON "public"."Client"
    FOR UPDATE
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Users can delete clients in their sites" ON "public"."Client";

-- Create new DELETE policy that checks both user_sites and user_organizations
CREATE POLICY "Users can delete clients in their sites"
    ON "public"."Client"
    FOR DELETE
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- ========================================
-- Verification
-- ========================================
DO $$
BEGIN
    -- Check if policies exist for Manufacturer
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'Manufacturer' 
        AND policyname = 'Users can insert manufacturers for their sites'
    ) THEN
        RAISE EXCEPTION 'Policy "Users can insert manufacturers for their sites" not found on Manufacturer table';
    END IF;

    -- Check if policies exist for Manufacturer_category
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'Manufacturer_category' 
        AND policyname = 'Users can insert manufacturer categories for their sites'
    ) THEN
        RAISE EXCEPTION 'Policy "Users can insert manufacturer categories for their sites" not found on Manufacturer_category table';
    END IF;

    -- Check if policies exist for Supplier_category
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'Supplier_category' 
        AND policyname = 'Users can insert supplier categories for their sites'
    ) THEN
        RAISE EXCEPTION 'Policy "Users can insert supplier categories for their sites" not found on Supplier_category table';
    END IF;

    -- Check if policies exist for Client
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'Client' 
        AND policyname = 'Users can view clients from their sites'
    ) THEN
        RAISE EXCEPTION 'Policy "Users can view clients from their sites" not found on Client table';
    END IF;

    RAISE NOTICE 'Migration completed successfully - Manufacturer, Manufacturer_category, Supplier_category, and Client RLS policies updated to check both user_sites and user_organizations';
END $$;
