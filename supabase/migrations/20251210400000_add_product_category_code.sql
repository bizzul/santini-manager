-- Add code field to Product_category table
ALTER TABLE "public"."Product_category"
ADD COLUMN IF NOT EXISTS "code" TEXT;

-- Add index for faster lookups by code
CREATE INDEX IF NOT EXISTS "idx_product_category_code" ON "public"."Product_category" ("code");

-- Add comment for documentation
COMMENT ON COLUMN "public"."Product_category"."code" IS 'Category code (e.g., LG for LEGNO)';
