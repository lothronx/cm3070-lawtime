import { Tables, TablesInsert } from "./supabase";

// Base Supabase types
export type Task = Tables<"tasks">;
export type Client = Tables<"clients">;
export type TaskFile = Tables<"task_files">;
export type CreateTaskRequest = TablesInsert<"tasks">;
export type CreateClientRequest = TablesInsert<"clients">;

// Extended types for joined queries
export type TaskWithClient = Task & {
  clients: Pick<Client, "client_name"> | null;
};

// Form-specific types for UI components
export interface TaskFormData {
  title: string;
  clientName: string;
  eventTime: Date | null;
  location: string;
  note: string;
  isNewClient?: boolean;
}

// Client resolution utility types
export interface ClientResolution {
  clientId: number | null;
  isNewClient: boolean;
  clientName: string;
}

// Query result types
export interface TasksQueryResult {
  tasks: TaskWithClient[];
  isLoading: boolean;
  error: Error | null;
}

export interface ClientsQueryResult {
  clients: Client[];
  isLoading: boolean;
  error: Error | null;
}

// Mutation types
export interface CreateTaskMutationVariables {
  taskData: TaskFormData;
  userId: string;
}

export interface CreateClientMutationVariables {
  clientName: string;
  userId: string;
}

// Constants for cache management
export const QUERY_KEYS = {
  TASKS: ["tasks"] as const,
  CLIENTS: ["clients"] as const,
  TASK_FILES: ["task_files"] as const,
} as const;

// Cache configuration constants
export const CACHE_CONFIG = {
  TASKS: {
    staleTime: 15 * 60 * 1000, // 15 minutes - tasks change frequently in legal practice
    gcTime: 4 * 60 * 60 * 1000, // 4 hours - keep in memory for active workday
  },
  CLIENTS: {
    staleTime: 60 * 60 * 1000, // 1 hour - clients are very stable in legal practice
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - long-term stability
  },
} as const;