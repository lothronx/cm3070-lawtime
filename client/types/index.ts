import { Database } from './supabase';

//////////// Database types ////////////
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
  
//////////// Storage types ////////////
/**
 * Unified attachment type system using discriminated union
 * Handles both temporary files (in temp_uploads) and permanent files (in task_files)
 */
export interface BaseAttachment {
  // Common properties for both temp and permanent files
  file_name: string;
  mime_type: string | null;
  created_at: string;
}

export interface PermanentAttachment extends BaseAttachment {
  // Permanent files have database records
  id: number; // Database ID
  storage_path: string;
  task_id: number;
  user_id: string;
  role: TaskFileRole;
  isTemporary: false;
}

export interface TempAttachment extends BaseAttachment {
  // Temp files only exist in storage, no DB record yet
  id: string; // fileName used as temp ID
  fileName: string; // Internal fileName for operations
  originalName: string; // User-friendly display name
  uri: string; // Local URI from picker
  size: number;
  path?: string; // Storage path after upload
  publicUrl?: string; // Public URL for access
  isUploading?: boolean;
  isTemporary: true;
}

// Discriminated union type
export type Attachment = PermanentAttachment | TempAttachment;

// Type guards for working with the union
export const isPermanentAttachment = (attachment: Attachment): attachment is PermanentAttachment => {
  return !attachment.isTemporary;
};

export const isTempAttachment = (attachment: Attachment): attachment is TempAttachment => {
  return attachment.isTemporary;
};

//////////// AI Service types ////////////
/**
 * AI Service Types for task proposals
 * Matches server-side LangGraph agent output format
 */

// Client resolution status from AI processing
export interface ClientResolution {
  status: 'MATCH_FOUND' | 'NEW_CLIENT_PROPOSED' | 'NO_CLIENT_IDENTIFIED';
  client_id: number | null;
  client_name: string | null;
}

// Single task proposed by AI agent
export interface ProposedTask {
  title: string;
  event_time: string | null; // ISO format datetime
  location: string | null;
  note: string;
  client_resolution: ClientResolution;
}

// Request format for AI backend
export interface TaskProposalRequest {
  source_type: 'ocr' | 'asr';
  source_file_urls: string[];
  client_list: { id: number; client_name: string }[];
}

// Response format from AI backend
export interface TaskProposalResponse {
  success: boolean;
  proposed_tasks: ProposedTask[];
  count: number;
}


