--
-- File: 0004_storage_policies.sql
-- Description: Sets up storage bucket policies for the task_files bucket
--              Allows authenticated users to upload, read, and delete their own files
--

-- 1. Create storage policies for the task_files bucket
-- These policies control access to files in Supabase Storage

-- Allow authenticated users to upload files to their own directory
CREATE POLICY "Users can upload to their own directory"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task_files' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read files from their own directory
CREATE POLICY "Users can read their own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'task_files'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update files in their own directory
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'task_files'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete files from their own directory
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task_files'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Enable RLS on the storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;