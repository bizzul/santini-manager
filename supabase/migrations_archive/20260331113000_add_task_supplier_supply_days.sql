-- Add supplier lead time in days to support automatic order date calculation.

ALTER TABLE "public"."TaskSupplier"
  ADD COLUMN IF NOT EXISTS "supplyDays" INTEGER;

COMMENT ON COLUMN "public"."TaskSupplier"."supplyDays" IS 'Lead time in days required before the target delivery date.';
