-- Sort order for sell product categories
ALTER TABLE public.sellproduct_categories
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS sellproduct_categories_site_sort_idx
  ON public.sellproduct_categories (site_id, sort_order);

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY site_id ORDER BY name ASC) - 1 AS new_sort_order
  FROM public.sellproduct_categories
)
UPDATE public.sellproduct_categories AS sc
SET sort_order = ranked.new_sort_order
FROM ranked
WHERE sc.id = ranked.id;

-- Subcategory metadata for sell products (derived from SellProduct.subcategory)
CREATE TABLE IF NOT EXISTS public.sellproduct_subcategory_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  category_id integer NOT NULL REFERENCES public.sellproduct_categories(id) ON DELETE CASCADE,
  subcategory_key text NOT NULL,
  subcategory_name text NOT NULL,
  description text NULL,
  image_url text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sellproduct_subcategory_images_unique
    UNIQUE (site_id, category_id, subcategory_key)
);

CREATE INDEX IF NOT EXISTS sellproduct_subcategory_images_site_category_idx
  ON public.sellproduct_subcategory_images (site_id, category_id);

CREATE INDEX IF NOT EXISTS sellproduct_subcategory_images_sort_idx
  ON public.sellproduct_subcategory_images (site_id, category_id, sort_order);

ALTER TABLE public.sellproduct_subcategory_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sellproduct_subcategory_images_select"
  ON public.sellproduct_subcategory_images FOR SELECT
  USING (true);

CREATE POLICY "sellproduct_subcategory_images_insert"
  ON public.sellproduct_subcategory_images FOR INSERT
  WITH CHECK (true);

CREATE POLICY "sellproduct_subcategory_images_update"
  ON public.sellproduct_subcategory_images FOR UPDATE
  USING (true);

CREATE POLICY "sellproduct_subcategory_images_delete"
  ON public.sellproduct_subcategory_images FOR DELETE
  USING (true);

GRANT ALL ON public.sellproduct_subcategory_images TO anon, authenticated, service_role;
