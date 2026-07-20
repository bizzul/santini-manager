-- Add address + coordinates to ev_fornitori so suppliers can be placed on the
-- Momentum map. Mirrors the location fields already present on ev_location.

ALTER TABLE "public"."ev_fornitori"
    ADD COLUMN IF NOT EXISTS "indirizzo" "text",
    ADD COLUMN IF NOT EXISTS "citta" "text",
    ADD COLUMN IF NOT EXISTS "lat" numeric,
    ADD COLUMN IF NOT EXISTS "lng" numeric;
