/**
 * Authentication and Profile Type Definitions
 * 
 * Consolidated types for the authentication domain, including:
 * - Core auth entities (User, Session)
 * - API request/response types
 * - Profile management types (derived from Supabase schema)
 * - Store state interfaces
 * 
 * NOTE: Profile types use Supabase-generated types as single source of truth
 */

import { Database, Tables, TablesInsert, TablesUpdate } from './supabase';

// ============================================================================
// Core Authentication Entities
// ============================================================================

export interface User {
  id: string;
  phone: string;
  created_at: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface SendOTPResponse {
  message: string;
}

export interface VerifyOTPResponse {
  message: string;
  session: AuthSession;
}

export interface APIError {
  error: string;
  details?: any;
}

// ============================================================================
// Profile Management Types (Supabase-Generated)
// ============================================================================

// Use Supabase-generated types as single source of truth
export type UserProfile = Tables<'profiles'>;
export type UpdateProfileData = TablesUpdate<'profiles'>;

// ============================================================================
// Store State Types
// ============================================================================

export interface AuthStore {
  // Auth Domain State
  session: AuthSession | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  
  // Profile Domain State (coupled with auth)
  profile: UserProfile | null;
  profileLoading: boolean;
  profileError: string | null;
  
  // Auth Domain Actions
  setSession: (session: AuthSession) => void;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearAuthError: () => void;
  
  // Profile Domain Actions
  loadProfile: () => Promise<void>;
  updateProfile: (updates: UpdateProfileData) => Promise<void>;
  clearProfile: () => void;
  clearProfileError: () => void;
}

// ============================================================================
// Service Error Types
// ============================================================================

export class AuthServiceError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'AuthServiceError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ============================================================================
// Type Guards and Utilities
// ============================================================================

export function isAuthSession(obj: any): obj is AuthSession {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.access_token === 'string' &&
    typeof obj.refresh_token === 'string' &&
    typeof obj.expires_at === 'number' &&
    obj.user &&
    typeof obj.user.id === 'string'
  );
}

export function isUserProfile(obj: any): obj is UserProfile {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.default_alert_offset_minutes === 'number' &&
    (obj.status === 'active' || obj.status === 'deleted') &&
    (obj.updated_at === null || typeof obj.updated_at === 'string')
  );
}