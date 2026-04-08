-- Speed up project deletion queries to avoid statement timeout.
CREATE INDEX IF NOT EXISTS idx_taskhistory_taskid ON "public"."TaskHistory" USING btree ("taskId");
CREATE INDEX IF NOT EXISTS idx_timetracking_task_id ON "public"."Timetracking" USING btree ("task_id");
CREATE INDEX IF NOT EXISTS idx_qualitycontrol_taskid ON "public"."QualityControl" USING btree ("taskId");
CREATE INDEX IF NOT EXISTS idx_packingcontrol_taskid ON "public"."PackingControl" USING btree ("taskId");
CREATE INDEX IF NOT EXISTS idx_errortracking_task_id ON "public"."Errortracking" USING btree ("task_id");
CREATE INDEX IF NOT EXISTS idx_qc_item_qualitycontrolid ON "public"."Qc_item" USING btree ("qualityControlId");
CREATE INDEX IF NOT EXISTS idx_packingitem_packingcontrolid ON "public"."PackingItem" USING btree ("packingControlId");
