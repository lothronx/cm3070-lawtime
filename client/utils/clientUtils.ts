/**
 * Client filtering and search utilities
 */

import { Database } from "@/types/supabase";

export type Client = Database["public"]["Tables"]["clients"]["Row"];

/**
 * Filters clients based on search query
 * @param clients - Array of client objects
 * @param query - Search query string
 * @returns Filtered array of clients
 */
export const filterClients = (clients: Client[], query: string): Client[] => {
  if (!query.trim()) {
    return clients;
  }

  return clients.filter((client) =>
    client.client_name.toLowerCase().includes(query.toLowerCase())
  );
};

/**
 * Debounces a function call
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};