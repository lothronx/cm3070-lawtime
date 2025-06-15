--
-- File: 0003_move_task_files_trigger.sql
-- Description: Creates a trigger to automatically move files from a temporary path
--              to a permanent, task-specific path in Supabase Storage.
--

-- 1. Create the Storage Bucket for Task Files
-- This ensures the bucket exists before we try to move files into it.
-- The `IF NOT EXISTS` clause prevents errors if the script is run multiple times.

INSERT INTO storage.buckets (id, name, public)
SELECT 'task_files', 'task_files', false
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'task_files'
);

-- 2. Create the function to handle the file move
-- This function is the core logic that will be executed by the trigger.

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
  temp_path := new.storage_path;

  -- Construct the new, permanent path in the format: {user_id}/{task_id}/{file_id}-{original_filename}
  -- This structure organizes files by user and task, and prepending the unique file ID prevents name collisions.
  permanent_path := new.user_id || '/' || new.task_id || '/' || new.id || '-' || new.file_name;

  -- Move the file in Supabase Storage from the temporary path to the permanent path.
  -- Note: This requires the 'storage_object_admin' role, which is granted to postgres and service_role.
  -- The SECURITY DEFINER clause ensures the function runs with the necessary permissions.
  PERFORM storage.move_object(
    'task_files', -- bucket_id
    temp_path,    -- source_key
    permanent_path -- destination_key
  );

  -- Update the storage_path column in the table to reflect the new, permanent location.
  UPDATE public.task_files
  SET storage_path = permanent_path
  WHERE id = new.id;

  RETURN new;
END;
$$;

-- 3. Create the trigger
-- This trigger fires after a new row is inserted into the public.task_files table.
-- For each new file record, it calls the handle_new_task_file() function to process it.

CREATE TRIGGER on_task_file_created
  AFTER INSERT ON public.task_files
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_task_file();
