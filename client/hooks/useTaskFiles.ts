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

  return {
    files: taskFilesQuery.data || [], // Array of TaskFile records from database
    isLoading: taskFilesQuery.isLoading,
    isError: taskFilesQuery.isError,
    error: taskFilesQuery.error,
    refetch: taskFilesQuery.refetch,
    isRefetching: taskFilesQuery.isRefetching,
  };
};