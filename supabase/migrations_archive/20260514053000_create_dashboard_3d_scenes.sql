-- Create persistent 3D dashboard scenes and asset storage.

CREATE TABLE IF NOT EXISTS "public"."dashboard_3d_scenes" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "site_id" uuid NOT NULL,
    "created_by" uuid,
    "name" text DEFAULT 'Prima dashboard 3D'::text NOT NULL,
    "status" text DEFAULT 'draft'::text NOT NULL,
    "format" text DEFAULT 'b2_h1'::text NOT NULL,
    "answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "scene_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT "dashboard_3d_scenes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "dashboard_3d_scenes_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE,
    CONSTRAINT "dashboard_3d_scenes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES auth.users("id") ON DELETE SET NULL,
    CONSTRAINT "dashboard_3d_scenes_status_check" CHECK ("status" IN ('draft', 'published')),
    CONSTRAINT "dashboard_3d_scenes_format_check" CHECK ("format" = 'b2_h1')
);

CREATE UNIQUE INDEX IF NOT EXISTS "dashboard_3d_scenes_one_per_site"
    ON "public"."dashboard_3d_scenes" ("site_id");

CREATE INDEX IF NOT EXISTS "idx_dashboard_3d_scenes_site_status"
    ON "public"."dashboard_3d_scenes" ("site_id", "status");

CREATE OR REPLACE FUNCTION "public"."update_dashboard_3d_scenes_updated_at"()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "dashboard_3d_scenes_updated_at_trigger" ON "public"."dashboard_3d_scenes";
CREATE TRIGGER "dashboard_3d_scenes_updated_at_trigger"
    BEFORE UPDATE ON "public"."dashboard_3d_scenes"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_dashboard_3d_scenes_updated_at"();

ALTER TABLE "public"."dashboard_3d_scenes" ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION "public"."dashboard_3d_user_can_access_site"(target_site_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM "public"."User" u
        WHERE u."authId" = auth.uid()::text
        AND u.role = 'superadmin'
    )
    OR target_site_id IN (
        SELECT us.site_id
        FROM "public"."user_sites" us
        WHERE us.user_id = auth.uid()
    )
    OR target_site_id IN (
        SELECT s.id
        FROM "public"."sites" s
        INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
        WHERE uo.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE POLICY "Users can view dashboard 3D scenes for their sites"
    ON "public"."dashboard_3d_scenes"
    FOR SELECT
    USING ("public"."dashboard_3d_user_can_access_site"("site_id"));

CREATE POLICY "Users can insert dashboard 3D scenes for their sites"
    ON "public"."dashboard_3d_scenes"
    FOR INSERT
    WITH CHECK (
        "public"."dashboard_3d_user_can_access_site"("site_id")
        AND ("created_by" IS NULL OR "created_by" = auth.uid())
    );

CREATE POLICY "Users can update dashboard 3D scenes for their sites"
    ON "public"."dashboard_3d_scenes"
    FOR UPDATE
    USING ("public"."dashboard_3d_user_can_access_site"("site_id"))
    WITH CHECK ("public"."dashboard_3d_user_can_access_site"("site_id"));

CREATE POLICY "Users can delete dashboard 3D scenes for their sites"
    ON "public"."dashboard_3d_scenes"
    FOR DELETE
    USING ("public"."dashboard_3d_user_can_access_site"("site_id"));

GRANT ALL ON "public"."dashboard_3d_scenes" TO authenticated;
GRANT ALL ON "public"."dashboard_3d_scenes" TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'dashboard-3d-assets',
    'dashboard-3d-assets',
    true,
    52428800,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'model/gltf-binary', 'model/gltf+json', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can upload dashboard 3D assets to their sites" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view dashboard 3D assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update dashboard 3D assets in their sites" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete dashboard 3D assets in their sites" ON storage.objects;

CREATE POLICY "Users can upload dashboard 3D assets to their sites"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'dashboard-3d-assets'
    AND "public"."dashboard_3d_user_can_access_site"("public"."get_site_id_from_storage_path"(name))
);

CREATE POLICY "Anyone can view dashboard 3D assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'dashboard-3d-assets');

CREATE POLICY "Users can update dashboard 3D assets in their sites"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'dashboard-3d-assets'
    AND "public"."dashboard_3d_user_can_access_site"("public"."get_site_id_from_storage_path"(name))
);

CREATE POLICY "Users can delete dashboard 3D assets in their sites"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'dashboard-3d-assets'
    AND "public"."dashboard_3d_user_can_access_site"("public"."get_site_id_from_storage_path"(name))
);

COMMENT ON TABLE "public"."dashboard_3d_scenes" IS 'Per-site 3D dashboard configuration in b2_h1 format.';
