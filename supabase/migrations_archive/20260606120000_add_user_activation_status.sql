-- Add activation_status to User table for draft collaborators
-- 'draft' = created without email, pending manual activation with password
-- 'active' = normal user (default for all existing records)

ALTER TABLE "public"."User"
  ADD COLUMN IF NOT EXISTS "activation_status" text NOT NULL DEFAULT 'active';

ALTER TABLE "public"."User"
  DROP CONSTRAINT IF EXISTS "User_activation_status_check";

ALTER TABLE "public"."User"
  ADD CONSTRAINT "User_activation_status_check"
  CHECK ("activation_status" IN ('draft', 'active'));
