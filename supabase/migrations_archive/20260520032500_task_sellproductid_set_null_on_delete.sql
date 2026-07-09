-- Allow deleting SellProduct rows even when referenced by Task rows.
-- Previously Task_sellProductId_fkey had no ON DELETE behavior, so any
-- product referenced by a task could not be removed, breaking the
-- "Elimina selezionati" flow on the products page.
-- We prefer SET NULL over CASCADE: tasks must survive (they hold history,
-- timetracking, quality controls, etc.), they just lose the link to the
-- removed product.

ALTER TABLE "public"."Task"
  DROP CONSTRAINT IF EXISTS "Task_sellProductId_fkey";

ALTER TABLE "public"."Task"
  ADD CONSTRAINT "Task_sellProductId_fkey"
  FOREIGN KEY ("sellProductId")
  REFERENCES "public"."SellProduct"("id")
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "Task_sellProductId_idx"
  ON "public"."Task" ("sellProductId");
