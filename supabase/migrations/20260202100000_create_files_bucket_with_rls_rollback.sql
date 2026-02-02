-- Rollback: Remove RLS policies for files bucket

DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete files" ON storage.objects;

-- Optionally remove the bucket (uncomment if needed)
-- DELETE FROM storage.buckets WHERE id = 'files';
