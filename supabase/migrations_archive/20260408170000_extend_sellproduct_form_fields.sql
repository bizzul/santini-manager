ALTER TABLE "public"."SellProduct"
  ADD COLUMN IF NOT EXISTS "subcategory" text,
  ADD COLUMN IF NOT EXISTS "product_type" text,
  ADD COLUMN IF NOT EXISTS "supplier_id" integer;

ALTER TABLE "public"."SellProduct"
  DROP CONSTRAINT IF EXISTS "SellProduct_supplier_id_fkey";

ALTER TABLE "public"."SellProduct"
  ADD CONSTRAINT "SellProduct_supplier_id_fkey"
  FOREIGN KEY ("supplier_id")
  REFERENCES "public"."Supplier"("id")
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "SellProduct_subcategory_idx"
  ON "public"."SellProduct" ("subcategory");

CREATE INDEX IF NOT EXISTS "SellProduct_product_type_idx"
  ON "public"."SellProduct" ("product_type");

CREATE INDEX IF NOT EXISTS "SellProduct_supplier_id_idx"
  ON "public"."SellProduct" ("supplier_id");

COMMENT ON COLUMN "public"."SellProduct"."subcategory" IS 'Sottocategoria del prodotto';
COMMENT ON COLUMN "public"."SellProduct"."product_type" IS 'Tipo del prodotto';
COMMENT ON COLUMN "public"."SellProduct"."supplier_id" IS 'Fornitore associato al prodotto';
