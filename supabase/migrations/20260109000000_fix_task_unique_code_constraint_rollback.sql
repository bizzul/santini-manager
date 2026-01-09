-- Rollback: Revert Task unique_code constraint to global uniqueness
-- WARNING: This will fail if there are duplicate unique_codes across different sites

-- Step 1: Drop the index
DROP INDEX IF EXISTS "public"."Task_unique_code_idx";

-- Step 2: Drop the site-specific composite constraint
ALTER TABLE "public"."Task" 
DROP CONSTRAINT IF EXISTS "Task_site_unique_code_key";

-- Step 3: Re-add the global unique constraint
-- NOTE: This will fail if there are now duplicate unique_codes across sites
ALTER TABLE "public"."Task"
ADD CONSTRAINT "Task_unique_code_key" UNIQUE ("unique_code");
