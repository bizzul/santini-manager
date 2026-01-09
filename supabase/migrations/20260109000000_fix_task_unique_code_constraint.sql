-- Migration: Fix Task unique_code constraint to be site-specific
-- The unique_code should be unique per site, not globally across all sites
-- This allows different sites to have the same task codes (e.g., "25-001")

-- Step 1: Drop the existing global unique constraint
ALTER TABLE "public"."Task" 
DROP CONSTRAINT IF EXISTS "Task_unique_code_key";

-- Step 2: Add a new composite unique constraint on (site_id, unique_code)
-- This ensures unique_code is unique within each site
ALTER TABLE "public"."Task"
ADD CONSTRAINT "Task_site_unique_code_key" UNIQUE ("site_id", "unique_code");

-- Step 3: Create an index for faster lookups by unique_code (useful for searches)
CREATE INDEX IF NOT EXISTS "Task_unique_code_idx" ON "public"."Task" ("unique_code");

-- Note: Tasks without a site_id will still need unique codes among themselves
-- because (NULL, 'code') and (NULL, 'code') are considered different in PostgreSQL UNIQUE constraints
-- If this is an issue, consider adding a partial unique index for NULL site_id:
-- CREATE UNIQUE INDEX "Task_unique_code_no_site_idx" ON "public"."Task" ("unique_code") WHERE "site_id" IS NULL;
