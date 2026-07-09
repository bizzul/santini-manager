-- Storage bucket for document branding assets (logo carta intestata per-site)
-- Path structure: {site_id}/logo.webp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'document-assets',
  'document-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Users can upload document assets to their sites"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'document-assets'
  AND public.get_site_id_from_storage_path(name) IN (
    SELECT site_id FROM public.user_sites WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view document assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'document-assets');

CREATE POLICY "Users can update document assets in their sites"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'document-assets'
  AND public.get_site_id_from_storage_path(name) IN (
    SELECT site_id FROM public.user_sites WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete document assets in their sites"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'document-assets'
  AND public.get_site_id_from_storage_path(name) IN (
    SELECT site_id FROM public.user_sites WHERE user_id = auth.uid()
  )
);
