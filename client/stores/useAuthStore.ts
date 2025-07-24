import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';

/**
 * Minimal Authentication Store
 * 
 * Stores only essential auth data:
 * - session: JWT tokens + minimal metadata
 * - isAuthenticated: computed from session existence
 * - isLoading: for UI loading states
 */

interface AuthStore {
  // Minimal State
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setSession: (session: Session) => void;
  clearSession: () => void;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  // Initial State
  session: null,
  isAuthenticated: false,
  isLoading: true,

  // Set session from server response
  setSession: (session: Session) => {
    set({
      session,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  // Clear session data
  clearSession: () => {
    set({
      session: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  // Check if session exists - getSession() handles token refresh automatically
  checkSession: async () => {
    set({ isLoading: true });
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        set({
          session: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      set({
        session,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Session check failed:', error);
      set({
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  // Logout and clear session
  logout: async () => {
    set({ isLoading: true });
    
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      set({
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));