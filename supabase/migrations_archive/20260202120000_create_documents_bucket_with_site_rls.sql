-- Create the documents storage bucket for product technical sheets and other documents
-- Path structure: {site_id}/sell-products/{filename}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true, -- Public for easy access via URL, but RLS controls who can upload/modify
  52428800, -- 50MB limit for larger PDFs
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Helper function to extract site_id from storage path (in public schema)
-- Path format: {site_id}/sell-products/{filename}
CREATE OR REPLACE FUNCTION public.get_site_id_from_storage_path(path text)
RETURNS uuid AS $$
BEGIN
  -- Extract the first segment (site_id) from the path
  RETURN (string_to_array(path, '/'))[1]::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Policy: Allow authenticated users to upload to documents bucket for their sites
CREATE POLICY "Users can upload documents to their sites"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND public.get_site_id_from_storage_path(name) IN (
    SELECT site_id FROM "public"."user_sites" WHERE user_id = auth.uid()
  )
);

-- Policy: Allow anyone to view documents (public bucket for easy PDF viewing)
CREATE POLICY "Anyone can view documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Policy: Allow authenticated users to update documents in their sites
CREATE POLICY "Users can update documents in their sites"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.get_site_id_from_storage_path(name) IN (
    SELECT site_id FROM "public"."user_sites" WHERE user_id = auth.uid()
  )
);

-- Policy: Allow authenticated users to delete documents in their sites
CREATE POLICY "Users can delete documents in their sites"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.get_site_id_from_storage_path(name) IN (
    SELECT site_id FROM "public"."user_sites" WHERE user_id = auth.uid()
  )
);
