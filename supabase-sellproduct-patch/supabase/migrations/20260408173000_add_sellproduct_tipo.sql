ALTER TABLE "public"."SellProduct"
  ADD COLUMN IF NOT EXISTS "tipo" text;

CREATE INDEX IF NOT EXISTS "SellProduct_tipo_idx"
  ON "public"."SellProduct" ("tipo");

COMMENT ON COLUMN "public"."SellProduct"."tipo" IS 'Tipo del prodotto (nuovo campo nativo, compatibile con product_type legacy)';
