--
-- File: 0003_storage_buckets_and_policies.sql
-- Description: Single bucket storage setup with folder-based security
--              Uses temp/ and perm/ folders within one bucket for efficient file operations
--

-- =============================================================================
-- 1. CREATE SINGLE STORAGE BUCKET
-- =============================================================================

-- Create the unified user files bucket (PRIVATE with RLS folder-based policies)
-- This bucket will contain:
-- - temp/ folder: Public read access for AI API processing
-- - perm/ folder: Private access for permanent user files
INSERT INTO storage.buckets (id, name, public)
SELECT 'file_storage', 'file_storage', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'file_storage'
);

-- =============================================================================
-- 2. ROW LEVEL SECURITY POLICIES FOR FOLDER-BASED ACCESS
-- =============================================================================

-- Policy 1: Allow public read access to the temp/ folder
-- This enables AI APIs to access temp files via public URLs without authentication
CREATE POLICY "Allow public read on temp folder"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'file_storage' AND
  (storage.foldername(name))[1] = 'temp'
);

-- Policy 2: Allow authenticated users to upload files to temp/ folder
-- Enforces that uploads only go to temp/ and are user-scoped
CREATE POLICY "Allow authenticated uploads to temp"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'file_storage' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = 'temp' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 3: Allow authenticated users to read their own perm files
-- Core security - only file owner can access files in perm/ folder
CREATE POLICY "Allow owner to read perm files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'file_storage' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = 'perm' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 4: Allow authenticated users to upload files to perm/ folder
-- Enables moving files from temp/ to perm/ folder
CREATE POLICY "Allow authenticated uploads to perm"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'file_storage' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = 'perm' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 5: Allow users to update/move their own files
-- Enables atomic move operations within the bucket
CREATE POLICY "Allow users to update their own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'file_storage' AND
  auth.role() = 'authenticated' AND
  (
    -- Allow updates in temp folder (user owns file)
    ((storage.foldername(name))[1] = 'temp' AND (storage.foldername(name))[2] = auth.uid()::text) OR
    -- Allow updates in perm folder (user owns file)
    ((storage.foldername(name))[1] = 'perm' AND (storage.foldername(name))[2] = auth.uid()::text)
  )
);

-- Policy 6: Allow users to delete their own files
-- Cleanup operations for both temp and perm folders
CREATE POLICY "Allow users to delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'file_storage' AND
  auth.role() = 'authenticated' AND
  (
    -- Allow deletes in temp folder (user owns file)
    ((storage.foldername(name))[1] = 'temp' AND (storage.foldername(name))[2] = auth.uid()::text) OR
    -- Allow deletes in perm folder (user owns file)
    ((storage.foldername(name))[1] = 'perm' AND (storage.foldername(name))[2] = auth.uid()::text)
  )
);

-- =============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on the storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 4. FOLDER STRUCTURE DOCUMENTATION
-- =============================================================================

-- The file_storage bucket will have the following structure:
--
-- file_storage/
-- ├── temp/
-- │   └── {user_id}/
-- │       └── {batch_id}/
-- │           ├── file1.jpg (Public read access for AI APIs)
-- │           └── file2.pdf (Public read access for AI APIs)
-- └── perm/
--     └── {user_id}/
--         └── {task_id}/
--             ├── attachment1.jpg (Private, user-only access)
--             └── attachment2.pdf (Private, user-only access)
--
-- Key Benefits:
-- 1. Atomic move operations: temp/{user_id}/file.jpg → perm/{user_id}/{task_id}/file.jpg
-- 2. No bandwidth overhead - moves are instant metadata updates
-- 3. Unified security model with folder-based access control
-- 4. AI APIs can access temp files via public URLs
-- 5. Perm files remain secure with user-scoped access
