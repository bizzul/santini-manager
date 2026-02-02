-- Rollback: Remove documents bucket and related policies

-- Drop policies first
DROP POLICY IF EXISTS "Users can upload documents to their sites" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents in their sites" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents in their sites" ON storage.objects;

-- Drop helper function (now in public schema)
DROP FUNCTION IF EXISTS public.get_site_id_from_storage_path(text);

-- Delete the bucket (this will fail if there are files - need to empty first)
DELETE FROM storage.buckets WHERE id = 'documents';
