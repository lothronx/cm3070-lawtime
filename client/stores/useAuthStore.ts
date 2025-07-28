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
  setSession: (session: Session) => Promise<void>;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial State
  session: null,
  isAuthenticated: false,
  isLoading: true,

  // Set session from server response
  setSession: async (session: Session) => {
    // First, set the session in Supabase client for RLS to work
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    set({
      session,
      isAuthenticated: true,
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

// Listen for auth state changes and sync with store
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // Only update if session is different to avoid loops
    const currentSession = useAuthStore.getState().session;
    if (!currentSession || currentSession.access_token !== session.access_token) {
      useAuthStore.setState({
        session,
        isAuthenticated: true,
        isLoading: false,
      });
    }
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.setState({
      session: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }
});