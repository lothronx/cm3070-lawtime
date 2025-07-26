/**
 * Task service layer for Supabase operations
 * Handles all task-related database operations
 * Uses RLS policies for automatic user filtering
 */

import { supabase } from '@/utils/supabase';
import { TaskInsert, TaskUpdate, TaskWithClient } from '@/types';
import { clientService } from './clientService';
import { useAuthStore } from '@/stores/useAuthStore';

export const taskService = {
  /**
   * Fetch all tasks for the current authenticated user with client information
   * Uses Supabase RLS policies for automatic user filtering
   * @returns Promise<TaskWithClient[]> - Array of tasks with client names sorted by event time
   */
  async getTasks(): Promise<TaskWithClient[]> {
    // RLS policies automatically filter by authenticated user
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        clients(
          client_name
        )
      `)
      .order('event_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    // Transform to flat TaskWithClient structure
    return (data || []).map(task => ({
      ...task,
      client_name: task.clients?.client_name || null,
    }));
  },

  /**
   * Create a new task for the current authenticated user
   * Handles client resolution (find existing or create new)
   * @param taskData - Task data with client_name for resolution
   * @returns Promise<TaskWithClient> - The created task with client information
   */
  async createTask(taskData: TaskWithClient): Promise<TaskWithClient> {
    // Get current authenticated user from auth store
    const { session } = useAuthStore.getState();
    
    if (!session?.user) {
      throw new Error('Authentication required. Please log in again.');
    }

    // Resolve client ID from client name
    let clientId: number | null = null;
    
    if (taskData.client_name?.trim()) {
      // Try to find existing client first
      const existingClient = await clientService.findClientByName(taskData.client_name);
      
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        // Create new client if not found
        const newClient = await clientService.createClient(taskData.client_name);
        clientId = newClient.id;
      }
    }

    // Prepare task insert data with explicit user_id
    const insertData: TaskInsert = {
      user_id: session.user.id,
      client_id: clientId,
      title: taskData.title,
      event_time: taskData.event_time,
      location: taskData.location || null,
      note: taskData.note || null,
      source_type: taskData.source_type || 'manual',
    };

    // Create the task with explicit user_id
    const { data, error } = await supabase
      .from('tasks')
      .insert(insertData)
      .select(`
        *,
        clients(
          client_name
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }

    // Transform to flat TaskWithClient structure
    return {
      ...data,
      client_name: data.clients?.client_name || null,
    };
  },

  /**
   * Update an existing task
   * @param taskId - ID of task to update
   * @param updates - Partial task data to update
   * @returns Promise<TaskWithClient> - The updated task with client information
   */
  async updateTask(taskId: number, updates: Partial<TaskWithClient>): Promise<TaskWithClient> {
    // Validate authentication
    const { session } = useAuthStore.getState();
    if (!session?.user) {
      throw new Error('Authentication required. Please log in again.');
    }

    // Resolve client changes if needed
    const resolvedClientId = await this._resolveClientForUpdate(updates);
    
    // Build final update data
    const updateData = this._buildUpdateData(updates, resolvedClientId);

    // Execute update
    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select(`
        *,
        clients(
          client_name
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }

    // Transform to flat structure
    return {
      ...data,
      client_name: data.clients?.client_name || null,
    };
  },

  /**
   * Helper: Resolve client ID based on update data
   * @private
   */
  async _resolveClientForUpdate(updates: Partial<TaskWithClient>): Promise<number | null | undefined> {
    // If client_name is explicitly provided, resolve it
    if (updates.client_name !== undefined) {
      return updates.client_name?.trim() 
        ? await this._findOrCreateClient(updates.client_name)
        : null; // Empty string = clear client
    }
    
    // If client_id is explicitly provided, use it
    if (updates.client_id !== undefined) {
      return updates.client_id;
    }
    
    // No client changes requested
    return undefined;
  },

  /**
   * Helper: Find existing client or create new one
   * @private
   */
  async _findOrCreateClient(clientName: string): Promise<number> {
    const existingClient = await clientService.findClientByName(clientName);
    if (existingClient) {
      return existingClient.id;
    }
    
    const newClient = await clientService.createClient(clientName);
    return newClient.id;
  },

  /**
   * Helper: Build final update data object
   * @private
   */
  _buildUpdateData(updates: Partial<TaskWithClient>, clientId: number | null | undefined): TaskUpdate {
    // Remove client_name (not a database field) and build base update
    const { client_name, ...baseUpdate } = updates;
    
    // Only include client_id if it should be changed
    if (clientId !== undefined) {
      return { ...baseUpdate, client_id: clientId };
    }
    
    return baseUpdate;
  },

  /**
   * Delete a task by ID
   * @param taskId - ID of task to delete
   * @returns Promise<void>
   */
  async deleteTask(taskId: number): Promise<void> {
    // Get current authenticated user from auth store
    const { session } = useAuthStore.getState();
    
    if (!session?.user) {
      throw new Error('Authentication required. Please log in again.');
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  },

  /**
   * Mark a task as completed
   * @param taskId - ID of task to complete
   * @returns Promise<TaskWithClient> - The updated task
   */
  async completeTask(taskId: number): Promise<TaskWithClient> {
    return this.updateTask(taskId, { 
      completed_at: new Date().toISOString(),
    });
  },

  /**
   * Mark a task as incomplete
   * @param taskId - ID of task to mark as incomplete
   * @returns Promise<TaskWithClient> - The updated task
   */
  async uncompleteTask(taskId: number): Promise<TaskWithClient> {
    return this.updateTask(taskId, { 
      completed_at: null,
    });
  },

  /**
   * Get a single task by ID with client information
   * @param taskId - ID of task to fetch
   * @returns Promise<TaskWithClient | null> - The task or null if not found
   */
  async getTaskById(taskId: number): Promise<TaskWithClient | null> {
    // Get current authenticated user from auth store
    const { session } = useAuthStore.getState();
    
    if (!session?.user) {
      throw new Error('Authentication required. Please log in again.');
    }

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        clients(
          client_name
        )
      `)
      .eq('id', taskId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch task: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    // Transform to flat TaskWithClient structure
    return {
      ...data,
      client_name: data.clients?.client_name || null,
    };
  },
};