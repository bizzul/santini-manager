-- Rollback Migration: Restore user_access_summary view
-- Date: 2025-01-19
-- Description: Rollback script to restore the user_access_summary view if needed

-- Step 1: Recreate the user_access_summary view
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

-- Step 2: Grant access to the view
GRANT SELECT ON "public"."user_access_summary" TO authenticated;

-- Step 3: Add comment for documentation
COMMENT ON VIEW "public"."user_access_summary" IS 'Provides a summary of all organizations and sites a user has access to';

-- Step 4: Verify the rollback
DO $$
BEGIN
    -- Check if the view was successfully recreated
    IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_access_summary') THEN
        RAISE EXCEPTION 'user_access_summary view was not recreated during rollback';
    END IF;
    
    RAISE NOTICE 'Rollback completed successfully - user_access_summary view restored';
END $$;
