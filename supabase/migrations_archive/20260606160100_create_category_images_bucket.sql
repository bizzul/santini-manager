-- Create category-images storage bucket for inventory category images
-- Path structure: {site_id}/{uuid}.webp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'category-images',
  'category-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policy: Allow authenticated users to upload category images to their sites
CREATE POLICY "Users can upload category images to their sites"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'category-images'
  AND public.get_site_id_from_storage_path(name) IN (
    SELECT site_id FROM "public"."user_sites" WHERE user_id = auth.uid()
  )
);

-- Policy: Allow anyone to view category images (public bucket)
CREATE POLICY "Anyone can view category images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'category-images');

-- Policy: Allow authenticated users to update category images in their sites
CREATE POLICY "Users can update category images in their sites"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'category-images'
  AND public.get_site_id_from_storage_path(name) IN (
    SELECT site_id FROM "public"."user_sites" WHERE user_id = auth.uid()
  )
);

-- Policy: Allow authenticated users to delete category images in their sites
CREATE POLICY "Users can delete category images in their sites"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'category-images'
  AND public.get_site_id_from_storage_path(name) IN (
    SELECT site_id FROM "public"."user_sites" WHERE user_id = auth.uid()
  )
);
