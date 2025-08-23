import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { taskService } from '@/services/taskService';
import { supabase } from '@/utils/supabase';
import { TaskWithClient } from '@/types';
import { useClients } from './useClients';

/**
 * Custom hook for fetching and caching tasks using TanStack Query
 * Manages legal tasks with client information from the database
 */
export const useTasks = () => {
  const queryCacheManager = useQueryClient();
  const { clients, createClient } = useClients();

  // Helper function to resolve client name to client ID
  const resolveClientId = async (clientName: string | null | undefined): Promise<number | null> => {
    if (!clientName?.trim()) {
      return null;
    }

    // Check if client already exists in current cache
    const existingClient = clients.find(client => 
      client.client_name.toLowerCase() === clientName.toLowerCase()
    );
    
    if (existingClient) {
      return existingClient.id;
    } else {
      // Use the useClients hook's createClient method (includes optimistic updates)
      const newClient = await createClient(clientName);
      return newClient.id;
    }
  };

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: taskService.getTasks,
  });

  // Mutation for creating new tasks with proper client handling
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: TaskWithClient) => {
      // Resolve client name to client ID using helper function
      const resolvedClientId = await resolveClientId(taskData.client_name);

      // Create the task with resolved client_id
      const taskDataWithClientId = {
        ...taskData,
        client_id: resolvedClientId,
      };

      return taskService.createTask(taskDataWithClientId);
    },
    onSuccess: () => {
      // Invalidate and refetch tasks after successful creation
      queryCacheManager.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Mutation for updating existing tasks
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: number; updates: Partial<TaskWithClient> }) => {
      // Handle client resolution if client_name is being updated
      let resolvedUpdates = { ...updates };
      
      if (updates.client_name !== undefined) {
        // Use helper function to resolve client name to ID (handles empty strings as null)
        resolvedUpdates.client_id = await resolveClientId(updates.client_name);
      }

      return taskService.updateTask(taskId, resolvedUpdates);
    },
    onSuccess: () => {
      // Invalidate and refetch tasks after successful update
      queryCacheManager.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Mutation for deleting tasks
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => {
      return taskService.deleteTask(taskId);
    },
    onSuccess: () => {
      // Invalidate and refetch tasks after successful deletion
      queryCacheManager.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Mutation for completing tasks
  const completeTaskMutation = useMutation({
    mutationFn: (taskId: number) => {
      return taskService.completeTask(taskId);
    },
    onSuccess: () => {
      // Invalidate and refetch tasks after completion status change
      queryCacheManager.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Mutation for uncompleting tasks
  const uncompleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => {
      return taskService.uncompleteTask(taskId);
    },
    onSuccess: () => {
      // Invalidate and refetch tasks after completion status change
      queryCacheManager.invalidateQueries({ queryKey: ['tasks'] });
    },
  });


  // Invalidate tasks cache when auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Invalidate and refetch tasks when auth state changes
        queryCacheManager.invalidateQueries({ queryKey: ['tasks'] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryCacheManager]);

  return {
    // Core data and states most components need
    tasks: tasksQuery.data || [],
    isLoading: tasksQuery.isLoading,
    isError: tasksQuery.isError,
    error: tasksQuery.error,
    
    // Essential actions (async versions for proper error handling)
    createTask: createTaskMutation.mutateAsync,
    updateTask: (taskId: number, updates: Partial<TaskWithClient>) => 
      updateTaskMutation.mutateAsync({ taskId, updates }),
    deleteTask: deleteTaskMutation.mutateAsync,
    completeTask: completeTaskMutation.mutateAsync,
    uncompleteTask: uncompleteTaskMutation.mutateAsync,
    
    // Single task lookup (uses cache-first approach)
    getTaskById: (taskId: number) => {
      // First try to find in existing cache
      const cachedTask = (tasksQuery.data || []).find(task => task.id === taskId);
      return cachedTask || null;
    },
    
    // Manual controls (mainly for error recovery)
    refetch: tasksQuery.refetch,
  };
};