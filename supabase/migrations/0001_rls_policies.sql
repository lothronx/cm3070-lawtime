--
-- File: 0001_rls_policies.sql
-- Description: Sets up Row Level Security (RLS) for all tables.
-- This is the primary security mechanism for the application.
--

-- 1. Enable RLS for all relevant tables
-- This command activates the RLS feature on a table. Without this, any policies created will not be enforced.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS Policies
-- These policies define the rules for accessing data. The `auth.uid()` function is a special Supabase
-- function that returns the UUID of the currently authenticated user making the request.

--
-- Policies for 'profiles' table
--
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

--
-- Policies for 'clients' table
--
CREATE POLICY "Users can view their own clients"
ON public.clients FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create clients for themselves"
ON public.clients FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
ON public.clients FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
ON public.clients FOR DELETE
USING (auth.uid() = user_id);

--
-- Policies for 'tasks' table
--
CREATE POLICY "Users can view their own tasks"
ON public.tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create tasks for themselves"
ON public.tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
ON public.tasks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
ON public.tasks FOR DELETE
USING (auth.uid() = user_id);

--
-- Policies for 'task_files' table
--
CREATE POLICY "Users can view their own task files"
ON public.task_files FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create task files for themselves"
ON public.task_files FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task files"
ON public.task_files FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task files"
ON public.task_files FOR DELETE
USING (auth.uid() = user_id);

--
-- Policies for 'user_devices' table
--
CREATE POLICY "Users can view their own devices"
ON public.user_devices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create devices for themselves"
ON public.user_devices FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices"
ON public.user_devices FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices"
ON public.user_devices FOR DELETE
USING (auth.uid() = user_id);
