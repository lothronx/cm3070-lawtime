import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { taskService } from '@/services/taskService';
import { supabase } from '@/utils/supabase';
import { TaskWithClient } from '@/types';
import { useClients } from './useClients';

/**
 * Responsibilities:
 * - React Query operations (queries and mutations)
 * - Cache management and invalidation
 * - Auth state synchronization
 * - Client resolution and business logic
 * - Task CRUD operations with business rules
 */
export function useTasks() {
  const queryClient = useQueryClient();
  const { clients, createClient } = useClients();

  // Query for all tasks
  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: taskService.getTasks,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: taskService.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: number; updates: Partial<TaskWithClient> }) => {
      return taskService.updateTask(taskId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: taskService.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: taskService.completeTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Incomplete task mutation
  const incompleteTaskMutation = useMutation({
    mutationFn: taskService.uncompleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Helper function to resolve client name to client ID
  const resolveClientId = useCallback(async (clientName: string | null | undefined): Promise<number | null> => {
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
  }, [clients, createClient]);

  // Business logic for creating tasks with client resolution
  const createTaskWithClientResolution = useCallback(async (taskData: TaskWithClient) => {
    // Resolve client name to client ID using helper function
    const resolvedClientId = await resolveClientId(taskData.client_name);

    // Create the task with resolved client_id
    const taskDataWithClientId = {
      ...taskData,
      client_id: resolvedClientId,
    };

    return createTaskMutation.mutateAsync(taskDataWithClientId);
  }, [resolveClientId, createTaskMutation.mutateAsync]);

  // Business logic for updating tasks with client resolution
  const updateTaskWithClientResolution = useCallback(async (taskId: number, updates: Partial<TaskWithClient>) => {
    // Handle client resolution if client_name is being updated
    let resolvedUpdates = { ...updates };

    if (updates.client_name !== undefined) {
      // Use helper function to resolve client name to ID (handles empty strings as null)
      resolvedUpdates.client_id = await resolveClientId(updates.client_name);
    }

    return updateTaskMutation.mutateAsync({ taskId, updates: resolvedUpdates });
  }, [resolveClientId, updateTaskMutation.mutateAsync]);

  // Auth state synchronization - invalidate cache when auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return {
    // Data
    tasks: tasksQuery.data || [],

    // Query state
    isLoading: tasksQuery.isLoading,
    isError: tasksQuery.isError,
    error: tasksQuery.error,

    // CRUD operations with business logic
    createTask: createTaskWithClientResolution,
    updateTask: updateTaskWithClientResolution,
    deleteTask: deleteTaskMutation.mutateAsync,
    completeTask: completeTaskMutation.mutateAsync,
    incompleteTask: incompleteTaskMutation.mutateAsync,

    // Utilities
    getTaskById: (taskId: number) => {
      return (tasksQuery.data || []).find(task => task.id === taskId) || null;
    },
    refetch: tasksQuery.refetch,

    // Mutation states
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
  };
}