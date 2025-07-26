/**
 * Client service layer for Supabase operations
 * Handles all client-related database operations
 * Uses RLS policies for automatic user filtering
 */

import { supabase } from '@/utils/supabase';
import { DbClient } from '@/types';

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
    // Validate and sanitize input
    const trimmedName = clientName.trim();
    if (!trimmedName) {
      throw new Error('Client name cannot be empty');
    }

    // Create new client - RLS policies automatically set user_id
    const { data, error } = await supabase
      .from('clients')
      .insert({
        client_name: trimmedName,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create client: ${error.message}`);
    }

    return data;
  },

  /**
   * Find a client by exact name match (case-insensitive)
   * Useful for client resolution during task creation
   * @param clientName - Name to search for
   * @returns Promise<DbClient | null> - Found client or null
   */
  async findClientByName(clientName: string): Promise<DbClient | null> {
    if (!clientName?.trim()) {
      return null;
    }

    // Case-insensitive search using ILIKE
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .ilike('client_name', clientName.trim())
      .limit(1)
      .maybeSingle(); // Returns null if no match, single record if found

    if (error) {
      throw new Error(`Failed to find client: ${error.message}`);
    }

    return data;
  },
};