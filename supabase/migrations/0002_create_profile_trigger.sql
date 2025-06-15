--
-- File: 0002_create_profile_trigger.sql
-- Description: Creates a trigger to automatically insert a new row into the public.profiles table
--              when a new user signs up in auth.users.
--

-- 1. Create the function
-- This function will be executed by the trigger.
-- It takes the user's ID from the new row in auth.users and creates a corresponding profile.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;


-- 2. Create the trigger
-- This trigger fires after a new user is inserted into the auth.users table.
-- For each new user, it calls the handle_new_user() function.

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
