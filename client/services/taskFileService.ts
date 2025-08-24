/**
 * Task file service layer for Supabase operations
 * Handles all task file-related database operations
 * Uses RLS policies for automatic user filtering
 */

import { supabase } from '@/utils/supabase';
import { TaskFile, TaskFileInsert } from '@/types';
import { useAuthStore } from '@/stores/useAuthStore';

export const taskFileService = {
  /**
   * Fetch all files for a specific task
   * Uses Supabase RLS policies for automatic user filtering
   * @param taskId - ID of the task to fetch files for
   * @returns Promise<TaskFile[]> - Array of task files sorted by creation time
   */
  async getTaskFiles(taskId: number): Promise<TaskFile[]> {
    // RLS policies automatically filter by authenticated user
    const { data, error } = await supabase
      .from('task_files')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch task files: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Create a new task file record
   * @param fileData - Task file data to create (user_id handled internally)
   * @returns Promise<TaskFile> - The created task file object
   */
  async createTaskFile(fileData: Omit<TaskFileInsert, 'user_id'>): Promise<TaskFile> {
    // Get current authenticated user from auth store
    const { session } = useAuthStore.getState();
    
    if (!session?.user) {
      throw new Error('Authentication required. Please log in again.');
    }

    const { data, error } = await supabase
      .from('task_files')
      .insert({
        ...fileData,
        user_id: session.user.id, 
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create task file: ${error.message}`);
    }

    return data;
  },

  /**
   * Delete a task file by ID
   * @param fileId - ID of task file to delete
   * @returns Promise<void>
   */
  async deleteTaskFile(fileId: number): Promise<void> {
    // Get current authenticated user from auth store
    const { session } = useAuthStore.getState();
    
    if (!session?.user) {
      throw new Error('Authentication required. Please log in again.');
    }

    const { error } = await supabase
      .from('task_files')
      .delete()
      .eq('id', fileId);

    if (error) {
      throw new Error(`Failed to delete task file: ${error.message}`);
    }
  },

  /**
   * Create multiple task file records in a single batch operation
   * @param taskId - ID of the task to associate files with
   * @param filesData - Array of task file data to create (user_id handled internally)
   * @returns Promise<TaskFile[]> - Array of created task file objects
   */
  async createMultipleTaskFiles(taskId: number, filesData: Omit<TaskFileInsert, 'user_id' | 'task_id'>[]): Promise<TaskFile[]> {
    // Get current authenticated user from auth store
    const { session } = useAuthStore.getState();
    
    if (!session?.user) {
      throw new Error('Authentication required. Please log in again.');
    }

    // Batch create task files - RLS policies automatically enforce user_id
    const { data, error } = await supabase
      .from('task_files')
      .insert(
        filesData.map(fileData => ({
          ...fileData,
          task_id: taskId,
          user_id: session.user.id, // Explicitly set user_id for clarity
        }))
      )
      .select();

    if (error) {
      throw new Error(`Failed to create task files: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Get a single task file by ID
   * @param fileId - ID of task file to fetch
   * @returns Promise<TaskFile | null> - The task file or null if not found
   */
  async getTaskFileById(fileId: number): Promise<TaskFile | null> {
    // Get current authenticated user from auth store
    const { session } = useAuthStore.getState();
    
    if (!session?.user) {
      throw new Error('Authentication required. Please log in again.');
    }

    const { data, error } = await supabase
      .from('task_files')
      .select('*')
      .eq('id', fileId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch task file: ${error.message}`);
    }

    return data;
  },
};