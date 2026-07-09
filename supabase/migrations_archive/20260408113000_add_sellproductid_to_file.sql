ALTER TABLE "public"."File"
ADD COLUMN IF NOT EXISTS "sellProductId" integer;

ALTER TABLE "public"."File"
DROP CONSTRAINT IF EXISTS "File_sellProductId_fkey";

ALTER TABLE "public"."File"
ADD CONSTRAINT "File_sellProductId_fkey"
FOREIGN KEY ("sellProductId")
REFERENCES "public"."SellProduct"("id")
ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "File_sellProductId_idx"
ON "public"."File" ("sellProductId");
