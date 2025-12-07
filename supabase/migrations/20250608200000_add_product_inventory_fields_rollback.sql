-- Rollback: Remove inventory fields from Product table

-- Drop indexes
DROP INDEX IF EXISTS "public"."Product_internal_code_unique_idx";
DROP INDEX IF EXISTS "public"."Product_category_idx";
DROP INDEX IF EXISTS "public"."Product_category_code_idx";
DROP INDEX IF EXISTS "public"."Product_subcategory_idx";
DROP INDEX IF EXISTS "public"."Product_warehouse_number_idx";

-- Remove columns
ALTER TABLE "public"."Product" 
  DROP COLUMN IF EXISTS "category",
  DROP COLUMN IF EXISTS "category_code",
  DROP COLUMN IF EXISTS "subcategory",
  DROP COLUMN IF EXISTS "subcategory_code",
  DROP COLUMN IF EXISTS "subcategory2",
  DROP COLUMN IF EXISTS "subcategory2_code",
  DROP COLUMN IF EXISTS "color",
  DROP COLUMN IF EXISTS "color_code",
  DROP COLUMN IF EXISTS "internal_code",
  DROP COLUMN IF EXISTS "warehouse_number",
  DROP COLUMN IF EXISTS "supplier_code",
  DROP COLUMN IF EXISTS "producer",
  DROP COLUMN IF EXISTS "producer_code",
  DROP COLUMN IF EXISTS "url_tds",
  DROP COLUMN IF EXISTS "image_url",
  DROP COLUMN IF EXISTS "thickness",
  DROP COLUMN IF EXISTS "diameter",
  DROP COLUMN IF EXISTS "sell_price";

