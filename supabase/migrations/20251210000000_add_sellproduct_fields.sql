-- Migration: Add new fields to SellProduct table
-- New structure: Categoria, Sottocategoria, Descrizione, Listino Prezzi (checkbox), Immagine, DOC

-- Rename 'name' to 'category' and 'type' to 'subcategory' for clarity
-- Note: We'll keep 'name' as category and 'type' as subcategory to maintain backwards compatibility

-- Add description field
ALTER TABLE "public"."SellProduct" 
  ADD COLUMN IF NOT EXISTS "description" text;

-- Add price_list field (checkbox/boolean for price list inclusion)
ALTER TABLE "public"."SellProduct" 
  ADD COLUMN IF NOT EXISTS "price_list" boolean DEFAULT false;

-- Add image_url field
ALTER TABLE "public"."SellProduct" 
  ADD COLUMN IF NOT EXISTS "image_url" text;

-- Add doc_url field (link to folder with all documents)
ALTER TABLE "public"."SellProduct" 
  ADD COLUMN IF NOT EXISTS "doc_url" text;

-- Add internal_code for CSV import (unique identifier for duplicate checking)
ALTER TABLE "public"."SellProduct" 
  ADD COLUMN IF NOT EXISTS "internal_code" text;

-- Create unique constraint on internal_code per site (for duplicate checking during import)
-- Using a partial index to allow NULLs
CREATE UNIQUE INDEX IF NOT EXISTS "SellProduct_internal_code_site_unique_idx" 
  ON "public"."SellProduct" ("internal_code", "site_id") 
  WHERE "internal_code" IS NOT NULL;

-- Add index on category (name) for faster filtering
CREATE INDEX IF NOT EXISTS "SellProduct_name_idx" ON "public"."SellProduct" ("name");

-- Add comment for documentation
COMMENT ON COLUMN "public"."SellProduct"."name" IS 'Categoria del prodotto';
COMMENT ON COLUMN "public"."SellProduct"."type" IS 'Sottocategoria del prodotto';
COMMENT ON COLUMN "public"."SellProduct"."description" IS 'Descrizione del prodotto';
COMMENT ON COLUMN "public"."SellProduct"."price_list" IS 'Incluso nel listino prezzi';
COMMENT ON COLUMN "public"."SellProduct"."image_url" IS 'URL immagine del prodotto';
COMMENT ON COLUMN "public"."SellProduct"."doc_url" IS 'URL cartella documenti del prodotto';
COMMENT ON COLUMN "public"."SellProduct"."internal_code" IS 'Codice interno univoco per import CSV';

