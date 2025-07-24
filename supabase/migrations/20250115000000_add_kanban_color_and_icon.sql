-- Add color field to Kanban table
ALTER TABLE "public"."Kanban" ADD COLUMN "color" TEXT;

-- Add icon field to KanbanColumn table
ALTER TABLE "public"."KanbanColumn" ADD COLUMN "icon" TEXT; 