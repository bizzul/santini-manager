-- Add icon field to Kanban table
ALTER TABLE "public"."Kanban" ADD COLUMN IF NOT EXISTS "icon" TEXT;

-- Add a comment to describe the field
COMMENT ON COLUMN "public"."Kanban"."icon" IS 'Lucide icon name for the kanban board';
