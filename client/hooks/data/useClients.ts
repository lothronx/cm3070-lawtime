import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { clientService } from '@/services/clientService';
import { supabase } from '@/utils/supabase';
import { DbClient } from '@/types';

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

  // Mutation for creating new clients with optimistic updates
  const createClientMutation = useMutation({
    mutationFn: clientService.createClient,
    onSuccess: (newClient: DbClient) => {
      // Optimistically update the cache with the new client
      queryCacheManager.setQueryData<DbClient[]>(['legal-clients'], (oldClients) => {
        const currentClients: DbClient[] = oldClients || [];
        // Check if client already exists to avoid duplicates
        const clientExists = currentClients.some(client => client.id === newClient.id);
        if (clientExists) {
          return currentClients;
        }
        // Add new client and sort by name (handles both new users and existing users)
        return [...currentClients, newClient].sort((a, b) => 
          a.client_name.localeCompare(b.client_name)
        );
      });
    },
    onError: () => {
      // On error, invalidate to refetch fresh data
      queryCacheManager.invalidateQueries({ queryKey: ['legal-clients'] });
    },
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
    clients: legalClientsQuery.data || [],
    isLoading: legalClientsQuery.isLoading,
    isError: legalClientsQuery.isError,
    error: legalClientsQuery.error,
    
    createClient: createClientMutation.mutateAsync,
    refetch: legalClientsQuery.refetch,
  };
};