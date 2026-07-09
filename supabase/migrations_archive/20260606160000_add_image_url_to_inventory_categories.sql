-- Add image_url column to inventory_categories for category card images
ALTER TABLE public.inventory_categories
  ADD COLUMN IF NOT EXISTS image_url text NULL;
