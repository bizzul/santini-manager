-- Add show_category_colors column to Kanban table
-- This enables per-kanban option to colorize cards based on product category colors

ALTER TABLE "Kanban" 
ADD COLUMN IF NOT EXISTS show_category_colors BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN "Kanban".show_category_colors IS 'When enabled, cards in this kanban will be colored based on their associated product category color';
