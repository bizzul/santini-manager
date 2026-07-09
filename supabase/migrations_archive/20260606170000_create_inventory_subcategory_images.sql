-- Metadata table for inventory subcategory images (derived from variant attributes)
CREATE TABLE IF NOT EXISTS public.inventory_subcategory_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.inventory_categories(id) ON DELETE CASCADE,
  subcategory_key text NOT NULL,
  subcategory_name text NOT NULL,
  image_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_subcategory_images_unique
    UNIQUE (site_id, category_id, subcategory_key)
);

CREATE INDEX IF NOT EXISTS inventory_subcategory_images_site_category_idx
  ON public.inventory_subcategory_images (site_id, category_id);
