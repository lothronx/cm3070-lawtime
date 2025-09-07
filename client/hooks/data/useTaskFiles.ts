import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskFileService } from '@/services/taskFileService';
import { supabase } from '@/utils/supabase';
import { TaskFile, TaskFileInsert } from '@/types';

/**
 * Pure data layer hook for task files
 * Responsibilities:
 * - React Query operations
 * - Database queries and mutations
 * - Cache management
 * - Auth state synchronization
 */
export function useTaskFiles(taskId: number | null) {
  const queryClient = useQueryClient();

  // Query for permanent task files
  const taskFilesQuery = useQuery({
    queryKey: ['task-files', taskId],
    queryFn: () => taskId ? taskFileService.getTaskFiles(taskId) : [],
    enabled: !!taskId,
  });

  // Auth state changes - invalidate queries when auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        queryClient.invalidateQueries({ queryKey: ['task-files'] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // Create multiple task files mutation
  const createTaskFilesMutation = useMutation({
    mutationFn: async ({ taskId, files }: { taskId: number; files: Omit<TaskFileInsert, 'user_id' | 'task_id'>[] }) => {
      return await taskFileService.createMultipleTaskFiles(taskId, files);
    },
    onSuccess: (createdFiles, { taskId }) => {
      // Update cache with new files
      queryClient.setQueryData(['task-files', taskId], (old: TaskFile[] = []) => [
        ...old,
        ...createdFiles
      ]);
    },
  });

  // Delete task file mutation
  const deleteTaskFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await taskFileService.deleteTaskFile(fileId);
      return fileId;
    },
    onSuccess: (fileId) => {
      // Remove file from cache
      queryClient.setQueryData(['task-files', taskId], (old: TaskFile[] = []) =>
        old.filter(f => f.id !== fileId)
      );
    },
    onError: () => {
      // Invalidate queries on error to refresh data
      queryClient.invalidateQueries({ queryKey: ['task-files', taskId] });
    }
  });

  return {
    // Data
    taskFiles: taskFilesQuery.data || [],

    // Query state
    isLoading: taskFilesQuery.isLoading,
    isError: taskFilesQuery.isError,
    error: taskFilesQuery.error,

    // Actions
    createTaskFiles: createTaskFilesMutation.mutate,
    deleteTaskFile: deleteTaskFileMutation.mutate,
    refetch: taskFilesQuery.refetch,

    // Mutation states
    isCreating: createTaskFilesMutation.isPending,
    isDeleting: deleteTaskFileMutation.isPending,
  };
}