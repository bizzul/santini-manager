-- Fix documents bucket RLS policies to check both user_sites and user_organizations
-- The original policies only checked user_sites, but users might be in user_organizations

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload documents to their sites" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents in their sites" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents in their sites" ON storage.objects;

-- Create new INSERT policy that checks both user_sites and user_organizations
CREATE POLICY "Users can upload documents to their sites"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (
    -- Check user_sites
    public.get_site_id_from_storage_path(name) IN (
      SELECT site_id FROM "public"."user_sites" WHERE user_id = auth.uid()
    )
    OR
    -- Check user_organizations (user has access to site via organization membership)
    public.get_site_id_from_storage_path(name) IN (
      SELECT s.id
      FROM "public"."sites" s
      INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
      WHERE uo.user_id = auth.uid()
    )
  )
);

-- Create new UPDATE policy that checks both user_sites and user_organizations
CREATE POLICY "Users can update documents in their sites"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    public.get_site_id_from_storage_path(name) IN (
      SELECT site_id FROM "public"."user_sites" WHERE user_id = auth.uid()
    )
    OR
    public.get_site_id_from_storage_path(name) IN (
      SELECT s.id
      FROM "public"."sites" s
      INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
      WHERE uo.user_id = auth.uid()
    )
  )
);

-- Create new DELETE policy that checks both user_sites and user_organizations
CREATE POLICY "Users can delete documents in their sites"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    public.get_site_id_from_storage_path(name) IN (
      SELECT site_id FROM "public"."user_sites" WHERE user_id = auth.uid()
    )
    OR
    public.get_site_id_from_storage_path(name) IN (
      SELECT s.id
      FROM "public"."sites" s
      INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
      WHERE uo.user_id = auth.uid()
    )
  )
);
