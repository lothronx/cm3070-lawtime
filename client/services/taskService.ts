import { supabase } from '@/utils/supabase';
import { TaskWithClient, TaskInsert, ClientInsert } from '@/types';

/**
 * Task Service - Basic CRUD operations
 * 
 * Provides simple task and client management without complex caching.
 * Uses the flattened TaskWithClient type from forms directly.
 */

interface TaskServiceResult {
  success: boolean;
  task?: TaskWithClient;
  error?: string;
}

export class TaskService {
  /**
   * Create a new task with client resolution
   * @param formData - TaskWithClient data from form
   * @returns Result with created task or error
   */
  static async createTask(formData: TaskWithClient): Promise<TaskServiceResult> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return {
          success: false,
          error: 'Authentication required. Please log in again.'
        };
      }

      // Resolve client (get existing or create new)
      const clientId = await this.resolveClient(formData.client_name, user.id);
      
      if (!clientId) {
        return {
          success: false,
          error: 'Failed to resolve client information.'
        };
      }

      // Prepare task data for insertion
      const taskData: TaskInsert = {
        user_id: user.id,
        client_id: clientId,
        title: formData.title,
        event_time: formData.event_time,
        location: formData.location || null,
        note: formData.note || null,
        source_type: 'manual',
      };

      // Create the task
      const { data: createdTask, error: taskError } = await supabase
        .from('tasks')
        .insert(taskData)
        .select(`
          *,
          clients!inner(
            id,
            client_name,
            created_at
          )
        `)
        .single();

      if (taskError) {
        console.error('Task creation error:', taskError);
        return {
          success: false,
          error: 'Could not save task. Please try again.'
        };
      }

      // Transform the response to match TaskWithClient structure
      const taskWithClient: TaskWithClient = {
        ...createdTask,
        client_name: createdTask.clients.client_name,
      };

      return {
        success: true,
        task: taskWithClient
      };

    } catch (error) {
      console.error('Unexpected error creating task:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  /**
   * Resolve client by name - find existing or create new
   * @param clientName - Client name from form (can be null/empty)
   * @param userId - Current user ID
   * @returns Client ID or null if failed
   */
  static async resolveClient(clientName: string | null, userId: string): Promise<number | null> {
    try {
      // Handle empty client name - return null (no client)
      if (!clientName || clientName.trim() === '') {
        return null;
      }

      const trimmedName = clientName.trim();

      // First, try to find existing client (case-insensitive)
      const { data: existingClient, error: findError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .ilike('client_name', trimmedName)
        .single();

      if (findError && findError.code !== 'PGRST116') {
        // PGRST116 = not found, which is expected
        // Other errors are actual problems
        console.error('Error finding client:', findError);
        return null;
      }

      // If client exists, return its ID
      if (existingClient) {
        return existingClient.id;
      }

      // Client doesn't exist, create new one
      const clientData: ClientInsert = {
        user_id: userId,
        client_name: trimmedName,
      };

      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert(clientData)
        .select('id')
        .single();

      if (createError) {
        // Check for unique constraint violation
        if (createError.code === '23505') {
          // Race condition - client was created between our check and insert
          // Try to find it again
          const { data: raceClient, error: raceError } = await supabase
            .from('clients')
            .select('id')
            .eq('user_id', userId)
            .ilike('client_name', trimmedName)
            .single();

          if (raceError || !raceClient) {
            console.error('Race condition resolution failed:', raceError);
            return null;
          }

          return raceClient.id;
        }

        console.error('Error creating client:', createError);
        return null;
      }

      return newClient.id;

    } catch (error) {
      console.error('Unexpected error resolving client:', error);
      return null;
    }
  }
}