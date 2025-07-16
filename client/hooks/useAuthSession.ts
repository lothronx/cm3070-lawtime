import { useState, useEffect, useCallback } from 'react';
import AuthService from '@/services/authService';

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

interface AuthSessionState {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: AuthSession | null;
  user: User | null;
}

interface AuthSessionActions {
  setSession: (session: AuthSession) => void;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export function useAuthSession(): AuthSessionState & AuthSessionActions {
  const [state, setState] = useState<AuthSessionState>({
    isLoading: true,
    isAuthenticated: false,
    session: null,
    user: null,
  });

  const authService = AuthService.getInstance();

  // Check for existing session on app start
  const checkSession = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const storedSession = await authService.getStoredSession();
      const isValid = await authService.isSessionValid();

      if (storedSession && isValid) {
        setState({
          isLoading: false,
          isAuthenticated: true,
          session: storedSession,
          user: storedSession.user,
        });
      } else {
        // Clear invalid session
        if (storedSession && !isValid) {
          await authService.clearSession();
        }
        setState({
          isLoading: false,
          isAuthenticated: false,
          session: null,
          user: null,
        });
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setState({
        isLoading: false,
        isAuthenticated: false,
        session: null,
        user: null,
      });
    }
  }, [authService]);

  // Set new session after successful authentication
  const setSession = useCallback((session: AuthSession) => {
    setState({
      isLoading: false,
      isAuthenticated: true,
      session,
      user: session.user,
    });
  }, []);

  // Logout - clear session and state
  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await authService.clearSession();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setState({
        isLoading: false,
        isAuthenticated: false,
        session: null,
        user: null,
      });
    }
  }, [authService]);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return {
    ...state,
    setSession,
    logout,
    checkSession,
  };
}