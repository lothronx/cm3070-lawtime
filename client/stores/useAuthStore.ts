import { create } from 'zustand';
import AuthService from '@/services/authService';
import ProfileService, { UserProfile, UpdateProfileData } from '@/services/profileService';

/**
 * Consolidated authentication and profile store
 * 
 * Domain boundaries:
 * - Auth Domain: session management, login/logout
 * - Profile Domain: user profile data (coupled with auth)
 * 
 * Usage examples:
 * - const { isAuthenticated, session, login, logout } = useAuthStore();
 * - const { profile, loadProfile, updateProfile } = useAuthStore();
 * - const login = useAuthStore(state => state.login); // Selective subscription
 */

interface User {
  id: string;
  phone: string;
  created_at: string;
}

interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

interface AuthStore {
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

// Single service instances for the entire store
const authService = AuthService.getInstance();
const profileService = ProfileService.getInstance();

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial Auth State
  session: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authError: null,
  
  // Initial Profile State
  profile: null,
  profileLoading: false,
  profileError: null,

  // Auth Actions
  setSession: (session: AuthSession) => {
    set({
      session,
      user: session.user,
      isAuthenticated: true,
      isLoading: false,
      authError: null,
    });
  },

  checkSession: async () => {
    set({ isLoading: true, authError: null });
    
    try {
      // Use getValidSession which automatically handles token refresh
      const validSession = await authService.getValidSession();

      if (validSession) {
        set({
          session: validSession,
          user: validSession.user,
          isAuthenticated: true,
          isLoading: false,
          authError: null,
        });
      } else {
        set({
          session: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          authError: null,
        });
      }
    } catch (error) {
      console.error('Error checking session:', error);
      set({
        session: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        authError: null,
      });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    
    try {
      await authService.clearSession();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      set({
        // Clear auth state
        session: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        authError: null,
        // Clear profile state
        profile: null,
        profileLoading: false,
        profileError: null,
      });
    }
  },

  clearAuthError: () => {
    set({ authError: null });
  },

  // Profile Actions
  loadProfile: async () => {
    const { profileLoading, isAuthenticated } = get();
    if (profileLoading || !isAuthenticated) return; // Prevent concurrent loads or unauthenticated calls
    
    set({ profileLoading: true, profileError: null });
    
    try {
      const { data, error } = await profileService.getOrCreateProfile();
      
      if (error) {
        set({ profileError: error, profileLoading: false });
      } else {
        set({ profile: data, profileLoading: false, profileError: null });
      }
    } catch (exception) {
      const errorMessage = exception instanceof Error ? exception.message : String(exception);
      set({ 
        profileError: `Unexpected error: ${errorMessage}`, 
        profileLoading: false 
      });
    }
  },

  updateProfile: async (updates: UpdateProfileData) => {
    const { profile, isAuthenticated } = get();
    if (!profile || !isAuthenticated) {
      set({ profileError: 'No profile loaded or user not authenticated' });
      return;
    }

    set({ profileLoading: true, profileError: null });

    try {
      const { data, error } = await profileService.updateProfile(updates);

      if (error) {
        set({ profileError: `Failed to save: ${error}`, profileLoading: false });
      } else {
        set({ 
          profile: data, 
          profileLoading: false, 
          profileError: null 
        });
      }
    } catch (exception) {
      const errorMessage = exception instanceof Error ? exception.message : String(exception);
      set({ 
        profileError: `Unexpected error: ${errorMessage}`, 
        profileLoading: false 
      });
    }
  },

  clearProfile: () => {
    set({ 
      profile: null, 
      profileLoading: false, 
      profileError: null 
    });
  },

  clearProfileError: () => {
    set({ profileError: null });
  },
}));