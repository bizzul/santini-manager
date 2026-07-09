-- Create the site-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-images',
  'site-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create the site-logos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-logos',
  'site-logos',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policy: Allow authenticated users to upload to site-images
CREATE POLICY "Authenticated users can upload site images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'site-images');

-- Policy: Allow anyone to view site images (public bucket)
CREATE POLICY "Anyone can view site images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'site-images');

-- Policy: Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update site images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'site-images');

-- Policy: Allow authenticated users to delete site images
CREATE POLICY "Authenticated users can delete site images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'site-images');

-- Policy: Allow authenticated users to upload to site-logos
CREATE POLICY "Authenticated users can upload site logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'site-logos');

-- Policy: Allow anyone to view site logos (public bucket)
CREATE POLICY "Anyone can view site logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'site-logos');

-- Policy: Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update site logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'site-logos');

-- Policy: Allow authenticated users to delete site logos
CREATE POLICY "Authenticated users can delete site logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'site-logos');

