-- Add structured offer data fields to Task and supplier order date support.

ALTER TABLE "public"."Task"
  ADD COLUMN IF NOT EXISTS "offer_send_date" DATE,
  ADD COLUMN IF NOT EXISTS "offer_products" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "offer_followups" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "offer_loss_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "offer_loss_competitor_name" TEXT;

ALTER TABLE "public"."TaskSupplier"
  ADD COLUMN IF NOT EXISTS "orderDate" TIMESTAMP WITHOUT TIME ZONE;

COMMENT ON COLUMN "public"."Task"."offer_send_date" IS 'Indicative date when the offer should be sent.';
COMMENT ON COLUMN "public"."Task"."offer_products" IS 'Structured lines of the offer including product, quantity, price and description.';
COMMENT ON COLUMN "public"."Task"."offer_followups" IS 'Structured follow-up history for offer negotiation contacts.';
COMMENT ON COLUMN "public"."Task"."offer_loss_reason" IS 'Reason why an offer was lost.';
COMMENT ON COLUMN "public"."Task"."offer_loss_competitor_name" IS 'Competitor name when the lost offer was awarded to competition.';
COMMENT ON COLUMN "public"."TaskSupplier"."orderDate" IS 'Order date for a supplier line attached to a task.';
