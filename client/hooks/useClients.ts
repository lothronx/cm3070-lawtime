import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientService } from '@/services/clientService';
import { supabase } from '@/utils/supabase';

/**
 * Custom hook for fetching and caching legal clients using TanStack Query
 * Manages business clients (legal firms, individuals) from the database
 */
export const useClients = () => {
  const queryCacheManager = useQueryClient(); 

  const legalClientsQuery = useQuery({
    queryKey: ['legal-clients'], 
    queryFn: clientService.getClients,
  });

  // Invalidate legal clients cache when auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Invalidate and refetch legal clients when auth state changes
        queryCacheManager.invalidateQueries({ queryKey: ['legal-clients'] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryCacheManager]);

  return {
    clients: legalClientsQuery.data || [], // Array of DbClient records from database
    isLoading: legalClientsQuery.isLoading,
    isError: legalClientsQuery.isError,
    error: legalClientsQuery.error,
    refetch: legalClientsQuery.refetch,
    isRefetching: legalClientsQuery.isRefetching,
  };
};