import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { taskService } from '@/services/taskService';
import { supabase } from '@/utils/supabase';

/**
 * Custom hook for fetching and caching tasks using TanStack Query
 * Manages legal tasks with client information from the database
 */
export const useTasks = () => {
  const queryCacheManager = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: taskService.getTasks,
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
    tasks: tasksQuery.data || [], // Array of TaskWithClient records from database
    isLoading: tasksQuery.isLoading,
    isError: tasksQuery.isError,
    error: tasksQuery.error,
    refetch: tasksQuery.refetch,
    isRefetching: tasksQuery.isRefetching,
  };
};