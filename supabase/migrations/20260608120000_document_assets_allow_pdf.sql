-- Consenti PDF carta intestata nel bucket document-assets (overlay pdfme)
UPDATE storage.buckets
SET
  file_size_limit = 52428800, -- 50 MB
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ]
WHERE id = 'document-assets';
