import { Database } from './supabase';

/**
 * Type aliases pointing to Supabase types (single source of truth)
 */
export type Task = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];
export type DbClient = Database['public']['Tables']['clients']['Row'];
export type ClientInsert = Database['public']['Tables']['clients']['Insert'];
export type TaskFile = Database['public']['Tables']['task_files']['Row'];
export type TaskFileInsert = Database['public']['Tables']['task_files']['Insert'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type UserDevice = Database['public']['Tables']['user_devices']['Row'];

// Enum type aliases
export type TaskSourceType = Database['public']['Enums']['task_source_type'];
export type TaskFileRole = Database['public']['Enums']['task_file_role'];
export type ProfileStatus = Database['public']['Enums']['profile_status'];

/**
 * Flattened type combining all Task fields with all Client fields
 * Used for forms and displays
 * Automatically derived from Supabase types with conflict resolution
 */
export type TaskWithClient = Task & 
  Omit<DbClient, 'id' | 'created_at' | 'user_id'> 