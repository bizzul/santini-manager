-- Migration: Enable Realtime on User table
-- Date: 2026-01-19
-- Description: Enables Supabase Realtime for the User table to support
-- instant session invalidation when a user is deactivated

-- Enable Realtime replication for the User table
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."User";

-- Add comment for documentation
COMMENT ON TABLE "public"."User" IS 'User profile table with realtime enabled for session monitoring';
