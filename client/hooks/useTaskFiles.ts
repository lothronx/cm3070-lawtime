import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { taskFileService } from '@/services/taskFileService';
import { supabase } from '@/utils/supabase';
import { TaskFile } from '@/types';

/**
 * Custom hook for fetching and caching task files using TanStack Query
 * Manages file attachments and source documents for tasks
 */
export const useTaskFiles = (taskId: number | null) => {
  const queryCacheManager = useQueryClient();

  const taskFilesQuery = useQuery({
    queryKey: ['task-files', taskId],
    queryFn: () => {
      if (!taskId) {
        return Promise.resolve([]);
      }
      return taskFileService.getTaskFiles(taskId);
    },
    enabled: !!taskId, // Only run query when taskId is provided
  });

  // Invalidate task files cache when auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Invalidate and refetch task files when auth state changes
        queryCacheManager.invalidateQueries({ queryKey: ['task-files'] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryCacheManager]);

  /**
   * Delete a task file and update cache
   * @param fileId - ID of the file to delete
   */
  const deleteTaskFile = async (fileId: number) => {
    try {
      await taskFileService.deleteTaskFile(fileId);

      // Optimistically update the cache by removing the deleted file
      queryCacheManager.setQueryData(['task-files', taskId], (old: TaskFile[] = []) =>
        old.filter(file => file.id !== fileId)
      );

      // Also invalidate to ensure consistency
      queryCacheManager.invalidateQueries({ queryKey: ['task-files', taskId] });
    } catch (error) {
      console.error('Failed to delete task file:', error);
      // Re-fetch to ensure consistency after error
      queryCacheManager.invalidateQueries({ queryKey: ['task-files', taskId] });
      throw error;
    }
  };

  /**
   * Add new task files to the cache after creation
   * @param newFiles - Array of newly created TaskFile objects
   */
  const addTaskFiles = (newFiles: TaskFile[]) => {
    queryCacheManager.setQueryData(['task-files', taskId], (old: TaskFile[] = []) =>
      [...old, ...newFiles].sort((a, b) =>
        new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
      )
    );
  };

  /**
   * Invalidate and refetch task files cache
   */
  const invalidateTaskFiles = () => {
    queryCacheManager.invalidateQueries({ queryKey: ['task-files', taskId] });
  };

  return {
    files: taskFilesQuery.data || [], // Array of TaskFile records from database
    isLoading: taskFilesQuery.isLoading,
    isError: taskFilesQuery.isError,
    error: taskFilesQuery.error,
    refetch: taskFilesQuery.refetch,
    isRefetching: taskFilesQuery.isRefetching,

    // Actions
    deleteTaskFile,
    addTaskFiles,
    invalidateTaskFiles,
  };
};