-- =====================================================
-- Migration: Add sent_date field for offer tracking
-- Purpose: Track when an offer is sent to client
-- =====================================================

-- Add sent_date column to Task table
-- This field will be populated when a task is moved to "Inviata" column
-- in an offer kanban (is_offer_kanban = true)
ALTER TABLE "public"."Task" 
    ADD COLUMN IF NOT EXISTS "sent_date" TIMESTAMP WITH TIME ZONE;

-- Add index for efficient queries on sent_date
CREATE INDEX IF NOT EXISTS "idx_task_sent_date" ON "public"."Task" ("sent_date");

-- Comment for documentation
COMMENT ON COLUMN "public"."Task"."sent_date" IS 'Date when offer was sent to client. Used in offer kanbans to track follow-up timing.';

