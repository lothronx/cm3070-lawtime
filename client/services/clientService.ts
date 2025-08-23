/**
 * Client service layer for Supabase operations
 * Handles all client-related database operations
 * Uses RLS policies for automatic user filtering
 */

import { supabase } from '@/utils/supabase';
import { DbClient } from '@/types';
import { useAuthStore } from '@/stores/useAuthStore';

export const clientService = {
  /**
   * Fetch all clients for the current authenticated user
   * Uses Supabase RLS policies for automatic user filtering
   * @returns Promise<DbClient[]> - Array of client objects sorted by name
   */
  async getClients(): Promise<DbClient[]> {
    // RLS policies automatically filter by authenticated user
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('client_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch clients: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Create a new client for the current authenticated user
   * @param clientName - Name of the client to create
   * @returns Promise<DbClient> - The created client object
   */
  async createClient(clientName: string): Promise<DbClient> {
    // Get current authenticated user from auth store
    const { session } = useAuthStore.getState();

    if (!session?.user) {
      throw new Error('Authentication required. Please log in again.');
    }

    // Validate and sanitize input
    const trimmedName = clientName.trim();
    if (!trimmedName) {
      throw new Error('Client name cannot be empty');
    }

    // Create new client with explicit user_id
    const { data, error } = await supabase
      .from('clients')
      .insert({
        user_id: session.user.id,
        client_name: trimmedName,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create client: ${error.message}`);
    }

    return data;
  },
};