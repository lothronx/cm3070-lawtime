--
-- File: 0003_storage_buckets_and_policies.sql
-- Description: Complete storage setup for file management
--              Creates both temporary and permanent storage buckets with their policies
--

-- =============================================================================
-- 1. CREATE STORAGE BUCKETS
-- =============================================================================

-- Create the temporary uploads bucket (PUBLIC for backend AI service access)
INSERT INTO storage.buckets (id, name, public)
SELECT 'temp_uploads', 'temp_uploads', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'temp_uploads'
);

-- Create the permanent task files bucket (PRIVATE for security)
INSERT INTO storage.buckets (id, name, public)
SELECT 'task_files', 'task_files', false
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'task_files'
);

-- =============================================================================
-- 2. ROW LEVEL SECURITY POLICIES FOR TEMP_UPLOADS BUCKET
-- =============================================================================

-- Allow authenticated users to upload files to their own temp directory
CREATE POLICY "Users can upload to their own temp directory"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'temp_uploads' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to read temp files (for public AI API access)
-- Public bucket + open read policy enables AI services to access files via public URLs
CREATE POLICY "Anyone can read temp files"
ON storage.objects FOR SELECT
USING (bucket_id = 'temp_uploads');

-- Allow authenticated users to delete files from their own temp directory
-- Keep auth requirement for delete to prevent abuse
CREATE POLICY "Users can delete their own temp files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'temp_uploads'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================================================
-- 3. ROW LEVEL SECURITY POLICIES FOR TASK_FILES BUCKET
-- =============================================================================

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

-- =============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on the storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
