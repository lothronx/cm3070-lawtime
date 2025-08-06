--
-- File: 0003_storage_buckets_and_policies.sql
-- Description: Complete storage setup for file management
--              Creates both temporary and permanent storage buckets with their policies
--              and the trigger function to move files from temp to permanent storage
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

-- =============================================================================
-- 5. FILE MOVEMENT TRIGGER FUNCTION
-- =============================================================================

-- Create the function to handle moving files from temp to permanent storage
-- This function is triggered when a new task_file record is created
CREATE OR REPLACE FUNCTION public.handle_new_task_file()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  temp_path TEXT;
  permanent_path TEXT;
BEGIN
  -- Get the temporary path from the newly inserted row
  -- This should be a path in the temp_uploads bucket
  temp_path := new.storage_path;

  -- Construct the new, permanent path in the format: {user_id}/{task_id}/{file_id}-{original_filename}
  -- This structure organizes files by user and task, and prepending the unique file ID prevents name collisions.
  permanent_path := new.user_id || '/' || new.task_id || '/' || new.id || '-' || new.file_name;

  -- Move the file from temp_uploads bucket to task_files bucket
  -- Note: This requires the 'storage_object_admin' role, which is granted to postgres and service_role.
  -- The SECURITY DEFINER clause ensures the function runs with the necessary permissions.
  
  -- First, copy the file from temp_uploads to task_files
  PERFORM storage.copy_object(
    'temp_uploads',   -- source_bucket_id
    temp_path,        -- source_key
    'task_files',     -- destination_bucket_id
    permanent_path    -- destination_key
  );

  -- Then delete the file from temp_uploads to clean up
  PERFORM storage.delete_object(
    'temp_uploads',   -- bucket_id
    temp_path         -- object_key
  );

  -- Update the storage_path column in the table to reflect the new, permanent location.
  UPDATE public.task_files
  SET storage_path = permanent_path
  WHERE id = new.id;

  RETURN new;
END;
$$;

-- =============================================================================
-- 6. CREATE THE TRIGGER
-- =============================================================================

-- This trigger fires after a new row is inserted into the public.task_files table.
-- For each new file record, it calls the handle_new_task_file() function to process it.
CREATE TRIGGER on_task_file_created
  AFTER INSERT ON public.task_files
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_task_file();

-- =============================================================================
-- SUMMARY OF STORAGE SETUP
-- =============================================================================
--
-- TEMP_UPLOADS BUCKET (PUBLIC):
-- - Used for temporary file storage during AI processing
-- - Public bucket with open read policy allows AI services to access files via public URLs
-- - Files are organized by user: {user_id}/{filename}
-- - Users can upload and delete their own files
-- - Anyone can read files (no authentication required for AI APIs)
-- - Files are automatically moved to permanent storage when task is confirmed
--
-- TASK_FILES BUCKET (PRIVATE):
-- - Used for permanent file storage after user confirmation
-- - Private bucket for security of confirmed task files
-- - Files are organized by: {user_id}/{task_id}/{file_id}-{filename}
-- - Users can upload, read, update, and delete their own files
-- - Files are moved here automatically via trigger function
--
-- BACKEND ARCHITECTURE:
-- - Backend uses anon key for JWT verification only (no Supabase storage access)
-- - AI APIs access temp files via public URLs (no authentication)
-- - Frontend handles all Supabase storage operations directly
-- - Minimal backend-Supabase connection for security and performance
--
-- WORKFLOW:
-- 1. Frontend uploads file to temp_uploads bucket (authenticated)
-- 2. Frontend gets public URL and sends to backend for AI processing
-- 3. Backend verifies JWT and passes public URLs to AI APIs
-- 4. AI APIs access files directly via public URLs (no auth required)
-- 5. User reviews AI results and confirms
-- 6. Frontend creates task_files record with temp path
-- 7. Trigger automatically moves file from temp_uploads to task_files
-- 8. Temp file is cleaned up automatically
--
