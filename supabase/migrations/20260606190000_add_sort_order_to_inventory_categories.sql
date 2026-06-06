-- Custom display order for inventory categories
ALTER TABLE public.inventory_categories
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS inventory_categories_site_sort_idx
  ON public.inventory_categories (site_id, sort_order);

-- Backfill existing categories by name within each site
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY site_id ORDER BY name ASC) - 1 AS new_sort_order
  FROM public.inventory_categories
)
UPDATE public.inventory_categories AS ic
SET sort_order = ranked.new_sort_order
FROM ranked
WHERE ic.id = ranked.id;

-- Custom display order for subcategory metadata (per category)
ALTER TABLE public.inventory_subcategory_images
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS inventory_subcategory_images_sort_idx
  ON public.inventory_subcategory_images (site_id, category_id, sort_order);

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY site_id, category_id
      ORDER BY subcategory_name ASC
    ) - 1 AS new_sort_order
  FROM public.inventory_subcategory_images
)
UPDATE public.inventory_subcategory_images AS isi
SET sort_order = ranked.new_sort_order
FROM ranked
WHERE isi.id = ranked.id;
