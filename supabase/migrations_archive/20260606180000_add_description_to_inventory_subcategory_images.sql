ALTER TABLE public.inventory_subcategory_images
  ADD COLUMN IF NOT EXISTS description text NULL;
