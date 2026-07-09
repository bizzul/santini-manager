-- Migration: Add inventory fields to Product table for CSV import compatibility
-- Based on Inventario_Base_Santini.csv structure

-- Add category hierarchy fields
ALTER TABLE "public"."Product" 
  ADD COLUMN IF NOT EXISTS "category" text,
  ADD COLUMN IF NOT EXISTS "category_code" text,
  ADD COLUMN IF NOT EXISTS "subcategory" text,
  ADD COLUMN IF NOT EXISTS "subcategory_code" text,
  ADD COLUMN IF NOT EXISTS "subcategory2" text,
  ADD COLUMN IF NOT EXISTS "subcategory2_code" text;

-- Add color fields
ALTER TABLE "public"."Product" 
  ADD COLUMN IF NOT EXISTS "color" text,
  ADD COLUMN IF NOT EXISTS "color_code" text;

-- Add internal code (unique identifier from CSV)
ALTER TABLE "public"."Product" 
  ADD COLUMN IF NOT EXISTS "internal_code" text;

-- Add warehouse number
ALTER TABLE "public"."Product" 
  ADD COLUMN IF NOT EXISTS "warehouse_number" text;

-- Add supplier/producer codes
ALTER TABLE "public"."Product" 
  ADD COLUMN IF NOT EXISTS "supplier_code" text,
  ADD COLUMN IF NOT EXISTS "producer" text,
  ADD COLUMN IF NOT EXISTS "producer_code" text;

-- Add URL fields
ALTER TABLE "public"."Product" 
  ADD COLUMN IF NOT EXISTS "url_tds" text,
  ADD COLUMN IF NOT EXISTS "image_url" text;

-- Add additional dimensions
ALTER TABLE "public"."Product" 
  ADD COLUMN IF NOT EXISTS "thickness" double precision,
  ADD COLUMN IF NOT EXISTS "diameter" double precision;

-- Add sell price
ALTER TABLE "public"."Product" 
  ADD COLUMN IF NOT EXISTS "sell_price" double precision;

-- Create unique constraint on internal_code (for duplicate checking during import)
-- Using a partial index to allow NULLs
CREATE UNIQUE INDEX IF NOT EXISTS "Product_internal_code_unique_idx" 
  ON "public"."Product" ("internal_code") 
  WHERE "internal_code" IS NOT NULL;

-- Add index on category for faster filtering
CREATE INDEX IF NOT EXISTS "Product_category_idx" ON "public"."Product" ("category");
CREATE INDEX IF NOT EXISTS "Product_category_code_idx" ON "public"."Product" ("category_code");
CREATE INDEX IF NOT EXISTS "Product_subcategory_idx" ON "public"."Product" ("subcategory");
CREATE INDEX IF NOT EXISTS "Product_warehouse_number_idx" ON "public"."Product" ("warehouse_number");

-- Comments for documentation
COMMENT ON COLUMN "public"."Product"."category" IS 'Main category name (CAT from CSV)';
COMMENT ON COLUMN "public"."Product"."category_code" IS 'Main category code (COD_CAT from CSV)';
COMMENT ON COLUMN "public"."Product"."subcategory" IS 'Subcategory name (S_CAT from CSV)';
COMMENT ON COLUMN "public"."Product"."subcategory_code" IS 'Subcategory code (COD_S_CAT from CSV)';
COMMENT ON COLUMN "public"."Product"."subcategory2" IS 'Secondary subcategory name (S_CAT_2 from CSV)';
COMMENT ON COLUMN "public"."Product"."subcategory2_code" IS 'Secondary subcategory code (COD_S_CAT_2 from CSV)';
COMMENT ON COLUMN "public"."Product"."color" IS 'Color name (COLORE from CSV)';
COMMENT ON COLUMN "public"."Product"."color_code" IS 'Color code (COD_COLORE from CSV)';
COMMENT ON COLUMN "public"."Product"."internal_code" IS 'Unique internal product code (COD_INT from CSV)';
COMMENT ON COLUMN "public"."Product"."warehouse_number" IS 'Warehouse/location number (NR_MAG from CSV)';
COMMENT ON COLUMN "public"."Product"."supplier_code" IS 'Supplier code (COD_FORN from CSV)';
COMMENT ON COLUMN "public"."Product"."producer" IS 'Producer/manufacturer name (PRODUTTORE from CSV)';
COMMENT ON COLUMN "public"."Product"."producer_code" IS 'Producer code (COD_PROD from CSV)';
COMMENT ON COLUMN "public"."Product"."url_tds" IS 'Technical data sheet URL (URL_TDS from CSV)';
COMMENT ON COLUMN "public"."Product"."image_url" IS 'Product image URL (URL_IMM from CSV)';
COMMENT ON COLUMN "public"."Product"."thickness" IS 'Product thickness (SPESSORE from CSV)';
COMMENT ON COLUMN "public"."Product"."diameter" IS 'Product diameter (DIAMETRO from CSV)';
COMMENT ON COLUMN "public"."Product"."sell_price" IS 'Selling price in CHF (CHF_VENDITA from CSV)';

