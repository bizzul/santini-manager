-- Migration: Add company_role field to User table
-- This field represents the user's role within their company/organization (e.g., Manager, Developer, etc.)
-- This is different from the system 'role' field which controls access (superadmin, admin, user)

-- Add the company_role column to the User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS company_role TEXT DEFAULT NULL;

-- Add a comment to document the field
COMMENT ON COLUMN "User".company_role IS 'The user role within the company/organization (e.g., Manager, Developer, Operator). This is distinct from the system role which controls access permissions.';

-- Create an index for potential filtering by company_role
CREATE INDEX IF NOT EXISTS idx_user_company_role ON "User" (company_role);

